import type {
  NormalizedProduct,
  ProductAnalysisResult,
  AnalysisJobResponse,
  ProductFacts,
} from '@acme/shared';
import { DEFAULT_ONBOARDING_RESPONSE } from '@acme/shared';
import { randomUUID } from 'node:crypto';

import { getProductFactsService } from './product-facts-ai';
import { computeAllProfileScores, type ScoreProfileInput } from '../domain/score-engine/compute-score';
import { buildProductFactsFromData } from '../domain/product-facts/build-product-facts';
import { getProfileInputs } from './profileInputs';
import { updateScanAnalysisResult } from '../repositories/scanRepository';

const JOB_TTL_MS = 10 * 60 * 1000;
const jobs = new Map<string, AnalysisJobResponse>();

const scheduleCleanup = (jobId: string): void => {
  setTimeout(() => {
    jobs.delete(jobId);
  }, JOB_TTL_MS);
};

/**
 * Build ScoreProfileInput[] from userId.
 */
const buildProfiles = async (userId?: string): Promise<ScoreProfileInput[]> => {
  if (!userId) {
    return [{
      profileId: 'you',
      profileType: 'self',
      name: 'You',
      onboarding: DEFAULT_ONBOARDING_RESPONSE,
    }];
  }

  const inputs = await getProfileInputs(userId);
  if (inputs.length === 0) {
    return [{
      profileId: 'you',
      profileType: 'self',
      name: 'You',
      onboarding: DEFAULT_ONBOARDING_RESPONSE,
    }];
  }

  return inputs.map((input, index) => ({
    profileId: input.profileId,
    profileType: index === 0 ? 'self' as const : 'family_member' as const,
    name: input.profileName,
    onboarding: input.onboarding,
  }));
};

/**
 * Run the full analysis pipeline:
 *   1. AI extracts structured product facts (or deterministic fallback)
 *   2. Deterministic score engine computes per-profile scores
 *   3. Return final result
 */
const runAnalysisJob = async (
  jobId: string,
  product: NormalizedProduct,
  userId?: string,
  scanId?: string,
): Promise<void> => {
  const productName = product.product_name ?? product.code ?? 'unknown';
  console.log(`\n[Job:${jobId}] ▶ START  product="${productName}"  userId=${userId ?? 'anon'}`);
  const jobStart = Date.now();

  try {
    // Step 1: Build profiles
    const profiles = await buildProfiles(userId);
    const profileNames = profiles.map((p) => `"${p.name}"`).join(', ');
    console.log(`[Job:${jobId}] 👤 Profiles (${profiles.length}): ${profileNames}`);

    // Step 2: Extract product facts (AI or deterministic fallback)
    console.log(`[Job:${jobId}] 🧪 Step 1 — Extracting product facts...`);
    const factsStart = Date.now();
    let facts: ProductFacts;
    try {
      facts = await getProductFactsService().extractFacts(product);
    } catch {
      console.warn(`[Job:${jobId}] ⚠️ AI facts extraction failed, using deterministic fallback`);
      facts = buildProductFactsFromData(product);
    }
    console.log(`[Job:${jobId}] ✅ Facts extracted  ${Date.now() - factsStart}ms  type=${facts.productType}`);

    // Step 3: Deterministic score engine
    console.log(`[Job:${jobId}] 🧮 Step 2 — Computing scores...`);
    const scoreStart = Date.now();
    const profileScores = computeAllProfileScores(facts, profiles);
    console.log(`[Job:${jobId}] ✅ Scores computed  ${Date.now() - scoreStart}ms`);

    for (const ps of profileScores) {
      console.log(`[Job:${jobId}]   "${ps.name}" → score=${ps.score} (${ps.fitLabel})  +${ps.positives.length}✓ -${ps.negatives.length}✗`);
    }

    // Step 4: Build final result
    const result: ProductAnalysisResult = {
      productFacts: facts,
      profiles: profileScores,
    };

    const job = jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.result = result;
    }

    // Step 5: Persist to database
    if (scanId) {
      await updateScanAnalysisResult(scanId, 'completed', result).catch(() => {});
    }

    console.log(`[Job:${jobId}] 🏁 Job completed  total=${Date.now() - jobStart}ms`);
  } catch (err) {
    console.error(`[Job:${jobId}] ❌ Job failed:`, err);
    const job = jobs.get(jobId);
    if (job) {
      job.status = 'failed';
    }
    if (scanId) {
      await updateScanAnalysisResult(scanId, 'failed').catch(() => {});
    }
  }
};

/**
 * Create a new analysis job. Returns immediately with a pending job reference.
 */
export const createAnalysisJob = (
  product: NormalizedProduct,
  userId?: string,
  scanId?: string,
): { jobId: string; status: 'pending' } => {
  const jobId = randomUUID();
  const job: AnalysisJobResponse = {
    jobId,
    status: 'pending',
  };

  jobs.set(jobId, job);
  scheduleCleanup(jobId);
  void runAnalysisJob(jobId, product, userId, scanId);

  return { jobId, status: 'pending' };
};

/**
 * Create a pre-completed job from cached results.
 */
export const createCachedAnalysisJob = (
  cachedResult: ProductAnalysisResult,
): { jobId: string; status: 'completed' } => {
  const jobId = randomUUID();

  jobs.set(jobId, {
    jobId,
    status: 'completed',
    result: cachedResult,
  });
  scheduleCleanup(jobId);

  return { jobId, status: 'completed' };
};

/**
 * Get a job by its ID.
 */
export const getAnalysisJob = (jobId: string): AnalysisJobResponse | null => {
  return jobs.get(jobId) ?? null;
};
