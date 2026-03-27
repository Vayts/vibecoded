import type { BarcodeLookupProduct, MultiProfilePersonalAnalysisJobResponse } from '@acme/shared';

import { getIngredientAnalysisService } from './ingredientAnalysisAi';
import {
  computeProfileHash,
  findCachedIngredientAnalysis,
  upsertCachedIngredientAnalysis,
} from './ingredientCacheRepository';
import type { ProfileInput } from './profileInputs';
import { updateScanPersonalResult } from './scanRepository';

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
    for (const [profileId, entry] of cachedResults) {
      const detail = job.result?.detailsByProfile?.[profileId];
      if (detail) {
        detail.ingredientAnalysis = entry.result;
      }
    }
    for (const [profileId, entry] of aiResults) {
      const detail = job.result?.detailsByProfile?.[profileId];
      if (detail) {
        detail.ingredientAnalysis = entry.result;
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
