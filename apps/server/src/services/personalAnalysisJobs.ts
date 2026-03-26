import type {
  BarcodeLookupProduct,
  OnboardingResponse,
  PersonalAnalysisJob,
  PersonalAnalysisJobResponse,
  PersonalAnalysisResult,
} from '@acme/shared';
import { DEFAULT_ONBOARDING_RESPONSE } from '@acme/shared';
import { randomUUID } from 'node:crypto';

import { getUserOnboarding } from './onboarding';
import { buildPersonalProductAnalysis } from './personalProductAnalysis';
import { updateScanPersonalResult } from './scanRepository';
import { extractIngredients } from './ingredientExtraction';
import { getIngredientAnalysisService } from './ingredientAnalysisAi';
import {
  computeProfileHash,
  findCachedIngredientAnalysis,
  upsertCachedIngredientAnalysis,
} from './ingredientCacheRepository';

const JOB_TTL_MS = 10 * 60 * 1000;
const jobs = new Map<string, PersonalAnalysisJobResponse>();

const scheduleCleanup = (jobId: string): void => {
  setTimeout(() => {
    jobs.delete(jobId);
  }, JOB_TTL_MS);
};

const hasIngredientData = (product: BarcodeLookupProduct): boolean => {
  return extractIngredients(product) !== null;
};

/**
 * Phase 2: AI ingredient analysis — runs AFTER the job is already 'completed'.
 * Checks DB cache first; falls back to AI and caches the result.
 */
const runIngredientAnalysisAsync = async (
  jobId: string,
  product: BarcodeLookupProduct,
  onboarding: OnboardingResponse = DEFAULT_ONBOARDING_RESPONSE,
  scanId?: string,
): Promise<void> => {
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    const profileHash = computeProfileHash(onboarding);
    let ingredientAnalysis = await findCachedIngredientAnalysis(product.code, profileHash);

    if (!ingredientAnalysis) {
      ingredientAnalysis = await getIngredientAnalysisService().analyzeProduct(
        product,
        onboarding,
      );
      if (ingredientAnalysis) {
        await upsertCachedIngredientAnalysis(product.code, profileHash, ingredientAnalysis)
          .catch(() => {});
      }
    }

    if (job.result && ingredientAnalysis) {
      job.result.ingredientAnalysis = ingredientAnalysis;
    }
    job.ingredientAnalysisStatus = 'completed';

    if (scanId && job.result) {
      await updateScanPersonalResult(scanId, 'completed', job.result).catch(() => {});
    }
  } catch {
    if (job) {
      job.ingredientAnalysisStatus = 'completed';
    }
  }
};

/**
 * Phase 1: Heuristic personal analysis — instant, no AI.
 * Sets job to 'completed' immediately so the frontend gets results fast.
 */
const runPersonalAnalysisJob = async (
  jobId: string,
  product: BarcodeLookupProduct,
  userId?: string,
  scanId?: string,
): Promise<void> => {
  try {
    const onboarding = userId ? await getUserOnboarding(userId) : undefined;
    const result: PersonalAnalysisResult = buildPersonalProductAnalysis(product, onboarding);
    const productHasIngredients = hasIngredientData(product);

    // Mark completed immediately — personal analysis is ready
    jobs.set(jobId, {
      jobId,
      status: 'completed',
      result,
      ingredientAnalysisStatus: productHasIngredients ? 'pending' : 'skipped',
    });

    if (scanId) {
      await updateScanPersonalResult(scanId, 'completed', result).catch(() => {});
    }

    // Fire AI ingredient analysis async — does NOT block the job
    if (productHasIngredients) {
      void runIngredientAnalysisAsync(jobId, product, onboarding, scanId);
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
 * The client's first poll will return the full result immediately.
 */
export const createCachedPersonalAnalysisJob = (
  cachedResult: PersonalAnalysisResult,
): PersonalAnalysisJob => {
  const jobId = randomUUID();
  const hasIngredientAnalysis = Boolean(cachedResult.ingredientAnalysis);

  jobs.set(jobId, {
    jobId,
    status: 'completed',
    result: cachedResult,
    ingredientAnalysisStatus: hasIngredientAnalysis ? 'completed' : 'skipped',
  });
  scheduleCleanup(jobId);

  return { jobId, status: 'completed' };
};

export const getPersonalAnalysisJob = (jobId: string): PersonalAnalysisJobResponse | null => {
  return jobs.get(jobId) ?? null;
};
