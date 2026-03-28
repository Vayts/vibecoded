import type {
  BarcodeLookupProduct,
  PersonalAnalysisJob,
  PersonalAnalysisResult,
  MultiProfilePersonalAnalysisJobResponse,
  MultiProfilePersonalAnalysisResult,
  ProfileFitChip,
} from '@acme/shared';
import { DEFAULT_ONBOARDING_RESPONSE } from '@acme/shared';
import { randomUUID } from 'node:crypto';

import { buildPersonalProductAnalysis } from '../domain/personal-analysis/build-personal-analysis';
import { updateScanPersonalResult } from '../repositories/scanRepository';
import { extractIngredients } from '../domain/ingredient-analysis/extraction';
import { runIngredientAnalysisAsync } from './ingredientAnalysisRunner';
import { getProfileInputs, type ProfileInput } from './profileInputs';

const JOB_TTL_MS = 10 * 60 * 1000;
const jobs = new Map<string, MultiProfilePersonalAnalysisJobResponse>();

const scheduleCleanup = (jobId: string): void => {
  setTimeout(() => {
    jobs.delete(jobId);
  }, JOB_TTL_MS);
};

const hasIngredientData = (product: BarcodeLookupProduct): boolean => {
  return extractIngredients(product) !== null;
};

/**
 * Phase 1: Heuristic personal analysis — instant, no AI.
 * Runs analysis for user + all family members.
 * Sets job to 'completed' immediately so the frontend gets results fast.
 */
const runPersonalAnalysisJob = async (
  jobId: string,
  product: BarcodeLookupProduct,
  userId?: string,
  scanId?: string,
): Promise<void> => {
  try {
    const profiles = userId ? await getProfileInputs(userId) : [];
    const productHasIngredients = hasIngredientData(product);

    // If no user or no profiles, build default analysis
    if (profiles.length === 0) {
      const result: PersonalAnalysisResult = buildPersonalProductAnalysis(product);
      const profileChips: ProfileFitChip[] = [{
        profileId: 'you',
        profileName: 'You',
        fitScore: result.fitScore,
        fitLabel: result.fitLabel,
      }];

      const multiProfileData = {
        profiles: profileChips,
        detailsByProfile: { you: result },
      };

      jobs.set(jobId, {
        jobId,
        status: 'completed',
        result: multiProfileData,
        ingredientAnalysisStatus: productHasIngredients ? 'pending' : 'skipped',
      });

      if (scanId) {
        await updateScanPersonalResult(scanId, 'completed', result, multiProfileData).catch(() => {});
      }

      if (productHasIngredients) {
        const defaultProfile: ProfileInput = {
          profileId: 'you',
          profileName: 'You',
          onboarding: DEFAULT_ONBOARDING_RESPONSE,
        };
        const job = jobs.get(jobId)!;
        void runIngredientAnalysisAsync(job, product, [defaultProfile], scanId);
      }
      return;
    }

    // Run analysis for each profile
    const profileChips: ProfileFitChip[] = [];
    const detailsByProfile: Record<string, PersonalAnalysisResult> = {};

    for (const profile of profiles) {
      const result = buildPersonalProductAnalysis(product, profile.onboarding);
      profileChips.push({
        profileId: profile.profileId,
        profileName: profile.profileName,
        fitScore: result.fitScore,
        fitLabel: result.fitLabel,
      });
      detailsByProfile[profile.profileId] = result;
    }

    const multiProfileData = { profiles: profileChips, detailsByProfile };

    jobs.set(jobId, {
      jobId,
      status: 'completed',
      result: multiProfileData,
      ingredientAnalysisStatus: productHasIngredients ? 'pending' : 'skipped',
    });

    // Persist both primary user result + full multi-profile to the scan
    const youResult = detailsByProfile['you'];
    if (scanId) {
      await updateScanPersonalResult(
        scanId,
        'completed',
        youResult,
        multiProfileData,
      ).catch(() => {});
    }

    // Fire AI ingredient analysis async for ALL profiles
    if (productHasIngredients) {
      const job = jobs.get(jobId)!;
      void runIngredientAnalysisAsync(job, product, profiles, scanId);
    }
  } catch {
    jobs.set(jobId, {
      jobId,
      status: 'failed',
    });
    if (scanId) {
      await updateScanPersonalResult(scanId, 'failed').catch(() => {});
    }
  }
};

export const createPersonalAnalysisJob = (
  product: BarcodeLookupProduct,
  userId?: string,
  scanId?: string,
): PersonalAnalysisJob => {
  const jobId = randomUUID();
  const job: PersonalAnalysisJob = {
    jobId,
    status: 'pending',
  };

  jobs.set(jobId, job);
  scheduleCleanup(jobId);
  void runPersonalAnalysisJob(jobId, product, userId, scanId);

  return job;
};

/**
 * Create a pre-completed job from a cached personal analysis result.
 * Uses the full multi-profile result when available (includes family members).
 * Falls back to wrapping the primary user result for backward compatibility.
 */
export const createCachedPersonalAnalysisJob = (
  cachedResult: PersonalAnalysisResult,
  cachedMultiProfile?: MultiProfilePersonalAnalysisResult,
): PersonalAnalysisJob => {
  const jobId = randomUUID();

  const multiProfileData = cachedMultiProfile ?? {
    profiles: [{
      profileId: 'you',
      profileName: 'You',
      fitScore: cachedResult.fitScore,
      fitLabel: cachedResult.fitLabel,
    }],
    detailsByProfile: { you: cachedResult },
  };

  // Check if any profile has ingredient analysis
  const hasIngredientAnalysis = Object.values(multiProfileData.detailsByProfile).some(
    (d) => Boolean(d.ingredientAnalysis),
  );

  jobs.set(jobId, {
    jobId,
    status: 'completed',
    result: multiProfileData,
    ingredientAnalysisStatus: hasIngredientAnalysis ? 'completed' : 'skipped',
  });
  scheduleCleanup(jobId);

  return { jobId, status: 'completed' };
};

export const getPersonalAnalysisJob = (
  jobId: string,
): MultiProfilePersonalAnalysisJobResponse | null => {
  return jobs.get(jobId) ?? null;
};
