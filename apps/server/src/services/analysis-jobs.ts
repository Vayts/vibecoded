import type {
  NormalizedProduct,
  PersonalAnalysisJob,
  PersonalAnalysisResult,
  MultiProfilePersonalAnalysisJobResponse,
  MultiProfilePersonalAnalysisResult,
  ProfileFitChip,
} from '@acme/shared';
import { DEFAULT_ONBOARDING_RESPONSE } from '@acme/shared';
import { randomUUID } from 'node:crypto';

import { analyzeProductForProfiles } from './personal-analysis-ai';
import { runIngredientAnalysisAsync } from './ingredientAnalysisRunner';
import { updateScanPersonalResult } from '../repositories/scanRepository';
import { extractIngredients } from '../domain/ingredient-analysis/extraction';
import { getProfileInputs, type ProfileInput } from './profileInputs';
import { buildNutritionFallback } from '../domain/personal-analysis/nutrition-fallback';

const JOB_TTL_MS = 10 * 60 * 1000;
const jobs = new Map<string, MultiProfilePersonalAnalysisJobResponse>();

const scheduleCleanup = (jobId: string): void => {
  setTimeout(() => {
    jobs.delete(jobId);
  }, JOB_TTL_MS);
};

const hasIngredientData = (product: NormalizedProduct): boolean => {
  return extractIngredients(product) !== null;
};

/**
 * Run the full analysis pipeline:
 *   1. AI personal analysis (positives/negatives) — completes first, marks job done
 *   2. AI ingredient analysis — runs in background, updates job in-place
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
    const profiles = userId ? await getProfileInputs(userId) : [];
    const productHasIngredients = hasIngredientData(product);
    const job = jobs.get(jobId)!;

    // Ensure at least a default profile
    if (profiles.length === 0) {
      profiles.push({
        profileId: 'you',
        profileName: 'You',
        onboarding: DEFAULT_ONBOARDING_RESPONSE,
      });
    }

    const profileNames = profiles.map((p) => `"${p.profileName}"`).join(', ');
    console.log(`[Job:${jobId}] 👤 Profiles (${profiles.length}): ${profileNames}  hasIngredients=${productHasIngredients}`);

    // Phase 1: Run personal analysis (positives/negatives)
    console.log(`[Job:${jobId}] 🤖 Phase 1 — Personal analysis (AI)...`);
    const phase1Start = Date.now();
    const personalResults = await analyzeProductForProfiles(product, profiles).catch(
      (error) => {
        console.error(`[Job:${jobId}] ❌ Phase 1 failed:`, error);
        return new Map<string, PersonalAnalysisResult>();
      },
    );
    console.log(`[Job:${jobId}] ✅ Phase 1 done  ${Date.now() - phase1Start}ms  results=${personalResults.size}/${profiles.length}`);

    // Build multi-profile result from AI personal analysis
    const profileChips: ProfileFitChip[] = [];
    const detailsByProfile: Record<string, PersonalAnalysisResult> = {};

    for (const profile of profiles) {
      const aiResult = personalResults.get(profile.profileId);
      if (aiResult) {
        profileChips.push({
          profileId: profile.profileId,
          profileName: profile.profileName,
          fitScore: aiResult.fitScore,
          fitLabel: aiResult.fitLabel,
        });
        detailsByProfile[profile.profileId] = aiResult;
        console.log(`[Job:${jobId}]   "${profile.profileName}" → score=${aiResult.fitScore} (${aiResult.fitLabel})  +${aiResult.positives.length}✓ -${aiResult.negatives.length}✗`);
      } else {
        // Fallback: build deterministic nutrition-based result when AI didn't return this profile
        console.warn(`[Job:${jobId}] ⚠️  AI did not return result for profile "${profile.profileName}" (${profile.profileId}), using nutrition fallback`);
        const fallback = buildNutritionFallback(product);
        profileChips.push({
          profileId: profile.profileId,
          profileName: profile.profileName,
          fitScore: fallback.fitScore,
          fitLabel: fallback.fitLabel,
        });
        detailsByProfile[profile.profileId] = fallback;
      }
    }

    const multiProfileData: MultiProfilePersonalAnalysisResult = {
      profiles: profileChips,
      detailsByProfile,
    };

    job.result = multiProfileData;
    job.status = 'completed';

    if (!productHasIngredients) {
      job.ingredientAnalysisStatus = 'skipped';
    }

    // Phase 2: Run ingredient analysis in background (does not block main result)
    if (productHasIngredients) {
      console.log(`[Job:${jobId}] 🧪 Phase 2 — Ingredient analysis (background)...`);
      void runIngredientAnalysisForJob(job, product, profiles, scanId).catch((error) => {
        console.error(`[Job:${jobId}] ❌ Phase 2 failed:`, error);
        job.ingredientAnalysisStatus = 'failed';
      });
    } else {
      console.log(`[Job:${jobId}] ⏭  Phase 2 skipped — no ingredients data`);
    }

    // Persist to database (initial save without ingredient analysis)
    if (scanId) {
      const youResult = detailsByProfile['you'];
      await updateScanPersonalResult(scanId, 'completed', youResult, multiProfileData).catch(
        () => {},
      );
    }

    console.log(`[Job:${jobId}] 🏁 Job completed  total=${Date.now() - jobStart}ms`);
  } catch (err) {
    console.error(`[Job:${jobId}] ❌ Job failed:`, err);
    jobs.set(jobId, { jobId, status: 'failed' });
    if (scanId) {
      await updateScanPersonalResult(scanId, 'failed').catch(() => {});
    }
  }
};

/**
 * Run ingredient analysis and attach results to the job.
 * This function updates the job in-place as results come in.
 * Re-persists to database after completion if scanId is provided.
 */
const runIngredientAnalysisForJob = async (
  job: MultiProfilePersonalAnalysisJobResponse,
  product: NormalizedProduct,
  profiles: ProfileInput[],
  scanId?: string,
): Promise<void> => {
  const jobId = job.jobId;
  const start = Date.now();

  // Initialize ingredient analysis slots in existing result
  if (job.result) {
    for (const profile of profiles) {
      const detail = job.result.detailsByProfile[profile.profileId];
      if (detail && !detail.ingredientAnalysis) {
        detail.ingredientAnalysis = null;
      }
    }
  }

  job.ingredientAnalysisStatus = 'pending';
  await runIngredientAnalysisAsync(job, product, profiles);
  job.ingredientAnalysisStatus = 'completed';
  console.log(`[Job:${jobId}] ✅ Phase 2 done  ${Date.now() - start}ms`);

  // Re-persist with ingredient data
  if (scanId && job.result) {
    const youResult = job.result.detailsByProfile['you'];
    await updateScanPersonalResult(scanId, 'completed', youResult, job.result).catch(() => {});
  }
};

/**
 * Create a new analysis job that runs personal + ingredient analysis in parallel.
 * Returns immediately with a pending job reference.
 */
export const createAnalysisJob = (
  product: NormalizedProduct,
  userId?: string,
  scanId?: string,
): PersonalAnalysisJob => {
  const jobId = randomUUID();
  const job: MultiProfilePersonalAnalysisJobResponse = {
    jobId,
    status: 'pending',
    ingredientAnalysisStatus: 'pending',
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
  cachedResult: PersonalAnalysisResult,
  cachedMultiProfile?: MultiProfilePersonalAnalysisResult,
): PersonalAnalysisJob => {
  const jobId = randomUUID();

  const multiProfileData = cachedMultiProfile ?? {
    profiles: [
      {
        profileId: 'you',
        profileName: 'You',
        fitScore: cachedResult.fitScore,
        fitLabel: cachedResult.fitLabel,
      },
    ],
    detailsByProfile: { you: cachedResult },
  };

  const hasIngredientAnalysis = Object.values(multiProfileData.detailsByProfile).some((d) =>
    Boolean(d.ingredientAnalysis),
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

/**
 * Get a job by its ID.
 */
export const getAnalysisJob = (
  jobId: string,
): MultiProfilePersonalAnalysisJobResponse | null => {
  return jobs.get(jobId) ?? null;
};
