import type { NormalizedProduct, IngredientAnalysisResult, MultiProfilePersonalAnalysisJobResponse } from '@acme/shared';

import { getIngredientAnalysisService } from './ingredientAnalysisAi';
import {
  computeProfileHash,
  findCachedIngredientAnalysis,
  upsertCachedIngredientAnalysis,
} from '../repositories/ingredientCacheRepository';
import { getFitLabelFromScore } from '../domain/personal-analysis/build-personal-analysis';
import type { ProfileInput } from './profileInputs';

const PROFILE_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * AI ingredient analysis. Runs as part of the unified analysis flow.
 * Checks DB cache first per profile; uncached profiles are batched into a SINGLE AI request.
 * Results are attached to the job in-place.
 */
export const runIngredientAnalysisAsync = async (
  job: MultiProfilePersonalAnalysisJobResponse,
  product: NormalizedProduct,
  profiles: ProfileInput[],
): Promise<void> => {
  // Phase 1: check cache for all profiles in parallel
  const cacheCheckResults = await Promise.all(
    profiles.map(async (profile, i) => {
      const profileHash = computeProfileHash(profile.onboarding);
      const cached = await findCachedIngredientAnalysis(product.code, profileHash);
      return { profile, profileHash, label: PROFILE_LABELS[i] ?? `P${i}`, cached };
    }),
  );

  const cachedResults = new Map<string, { profileId: string; result: NonNullable<Awaited<ReturnType<typeof findCachedIngredientAnalysis>>> }>();
  const uncachedProfiles: { profile: ProfileInput; profileHash: string; label: string }[] = [];

  for (const check of cacheCheckResults) {
    if (check.cached) {
      cachedResults.set(check.profile.profileId, {
        profileId: check.profile.profileId,
        result: check.cached,
      });
    } else {
      uncachedProfiles.push({ profile: check.profile, profileHash: check.profileHash, label: check.label });
    }
  }

  // Phase 2: single AI call for all uncached profiles
  const aiResults = new Map<string, { profileId: string; profileHash: string; result: NonNullable<Awaited<ReturnType<typeof findCachedIngredientAnalysis>>> }>();

  if (uncachedProfiles.length > 0) {
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

    for (const uncached of uncachedProfiles) {
      const result = multiResult.get(uncached.label);
      if (result) {
        aiResults.set(uncached.profile.profileId, {
          profileId: uncached.profile.profileId,
          profileHash: uncached.profileHash,
          result,
        });
        await upsertCachedIngredientAnalysis(product.code, uncached.profileHash, result).catch(() => {});
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

  // Phase 4: apply allergen penalties derived from AI ingredient findings
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

    const penalty = Math.min(allergenBadItems.length * 30, 60);
    detail.fitScore = Math.max(0, detail.fitScore - penalty);
    detail.fitLabel = getFitLabelFromScore(detail.fitScore);

    for (const item of allergenBadItems) {
      const key = `allergy-ai-${item.normalized.replace(/\s+/g, '-').toLowerCase()}`;
      if (!detail.negatives.some((n) => n.key === key)) {
        detail.negatives.push({
          key,
          label: `${item.label} allergy conflict`,
          description: item.reason,
          value: null,
          unit: null,
          per: null,
          severity: 'bad',
          category: 'restriction',
          overview: item.reason,
        });
      }
    }

    const chip = job.result?.profiles.find((p) => p.profileId === profile.profileId);
    if (chip) {
      chip.fitScore = detail.fitScore;
      chip.fitLabel = detail.fitLabel;
    }
  }
};
