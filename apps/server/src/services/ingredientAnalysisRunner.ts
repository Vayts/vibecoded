import type { BarcodeLookupProduct, IngredientAnalysisResult, MultiProfilePersonalAnalysisJobResponse } from '@acme/shared';

import { getIngredientAnalysisService } from './ingredientAnalysisAi';
import {
  computeProfileHash,
  findCachedIngredientAnalysis,
  upsertCachedIngredientAnalysis,
} from '../repositories/ingredientCacheRepository';
import { getFitLabelFromScore } from '../domain/personal-analysis/build-personal-analysis';
import type { ProfileInput } from './profileInputs';
import { updateScanPersonalResult } from '../repositories/scanRepository';

const PROFILE_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * AI ingredient analysis — runs AFTER the job is already 'completed'.
 * Runs ingredient analysis for ALL profiles (user + family members).
 * Checks DB cache first per profile; uncached profiles are batched into a SINGLE AI request.
 */
export const runIngredientAnalysisAsync = async (
  job: MultiProfilePersonalAnalysisJobResponse,
  product: BarcodeLookupProduct,
  profiles: ProfileInput[],
  scanId?: string,
): Promise<void> => {
  try {
    // Phase 1: check cache for each profile
    const cachedResults = new Map<string, { profileId: string; result: NonNullable<Awaited<ReturnType<typeof findCachedIngredientAnalysis>>> }>();
    const uncachedProfiles: { profile: ProfileInput; profileHash: string; label: string }[] = [];

    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      const profileHash = computeProfileHash(profile.onboarding);
      const cached = await findCachedIngredientAnalysis(product.code, profileHash);

      if (cached) {
        cachedResults.set(profile.profileId, { profileId: profile.profileId, result: cached });
      } else {
        uncachedProfiles.push({
          profile,
          profileHash,
          label: PROFILE_LABELS[i] ?? `P${i}`,
        });
      }
    }

    // Phase 2: batch AI call for all uncached profiles
    const aiResults = new Map<string, { profileId: string; profileHash: string; result: NonNullable<Awaited<ReturnType<typeof findCachedIngredientAnalysis>>> }>();

    if (uncachedProfiles.length === 1) {
      // Single uncached profile — use simpler single-profile call
      const { profile, profileHash } = uncachedProfiles[0];
      const result = await getIngredientAnalysisService().analyzeProduct(
        product,
        profile.onboarding,
      );
      if (result) {
        aiResults.set(profile.profileId, { profileId: profile.profileId, profileHash, result });
        await upsertCachedIngredientAnalysis(product.code, profileHash, result).catch(() => {});
      }
    } else if (uncachedProfiles.length > 1) {
      // Multiple uncached profiles — single batched AI call
      const profilesForPrompt = uncachedProfiles.map((p) => ({
        label: p.label,
        name: p.profile.profileName,
        restrictions: p.profile.onboarding.restrictions,
        allergies: p.profile.onboarding.allergies,
        nutritionPriorities: p.profile.onboarding.nutritionPriorities,
        mainGoal: p.profile.onboarding.mainGoal,
      }));

      const multiResult = await getIngredientAnalysisService().analyzeProductMultiProfile(
        product,
        profilesForPrompt,
      );

      // Map labels back to profiles and cache each result
      for (const uncached of uncachedProfiles) {
        const result = multiResult.get(uncached.label);
        if (result) {
          aiResults.set(uncached.profile.profileId, {
            profileId: uncached.profile.profileId,
            profileHash: uncached.profileHash,
            result,
          });
          await upsertCachedIngredientAnalysis(product.code, uncached.profileHash, result)
            .catch(() => {});
        }
      }
    }

    // Phase 3: attach all results (cached + AI) to job
    const allResults = new Map<string, IngredientAnalysisResult>();

    for (const [profileId, entry] of cachedResults) {
      const detail = job.result?.detailsByProfile?.[profileId];
      if (detail) {
        detail.ingredientAnalysis = entry.result;
        allResults.set(profileId, entry.result);
      }
    }
    for (const [profileId, entry] of aiResults) {
      const detail = job.result?.detailsByProfile?.[profileId];
      if (detail) {
        detail.ingredientAnalysis = entry.result;
        allResults.set(profileId, entry.result);
      }
    }

    // Phase 4: apply allergen penalties derived from AI ingredient findings.
    // The allergen heuristic was intentionally removed from Phase 1 so that AI
    // knowledge (not regex token lists) determines allergen conflicts.
    // We identify allergen-related bad items by checking if the AI's reason
    // mentions "allerg" — matching "allergy", "allergen", "allergic" etc.
    for (const profile of profiles) {
      if (profile.onboarding.allergies.length === 0) continue;

      const ingredientResult = allResults.get(profile.profileId);
      if (!ingredientResult) continue;

      const detail = job.result?.detailsByProfile?.[profile.profileId];
      if (!detail) continue;

      const allergenBadItems = ingredientResult.ingredients.filter(
        (i) => i.status === 'bad' && i.matchesUserPreference === false && /allerg/i.test(i.reason),
      );

      if (allergenBadItems.length === 0) continue;

      // -30 per allergen conflict, capped at -60 total
      const penalty = Math.min(allergenBadItems.length * 30, 60);
      detail.fitScore = Math.max(0, detail.fitScore - penalty);
      detail.fitLabel = getFitLabelFromScore(detail.fitScore);

      // Add a negative entry for each allergen conflict not already present
      for (const item of allergenBadItems) {
        const key = `allergy-ai-${item.normalized.replace(/\s+/g, '-').toLowerCase()}`;
        if (!detail.negatives.some((n) => n.key === key)) {
          detail.negatives.push({
            key,
            label: `${item.label} allergy conflict`,
            description: item.reason,
            value: null,
            unit: null,
            severity: 'bad',
            overview: item.reason,
          });
        }
      }

      // Keep the profile chip score in sync
      const chip = job.result?.profiles.find((p) => p.profileId === profile.profileId);
      if (chip) {
        chip.fitScore = detail.fitScore;
        chip.fitLabel = detail.fitLabel;
      }
    }

    job.ingredientAnalysisStatus = 'completed';

    if (scanId && job.result) {
      const youResult = job.result.detailsByProfile['you'];
      await updateScanPersonalResult(scanId, 'completed', youResult, job.result).catch(() => {});
    }
  } catch {
    job.ingredientAnalysisStatus = 'completed';
  }
};
