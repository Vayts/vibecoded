import type {
  NormalizedProduct,
  ProductAnalysisResult,
  AnalysisJobResponse,
  ProductFacts,
  NutritionFacts,
  IngredientAnalysis,
} from '@acme/shared';
import { DEFAULT_ONBOARDING_RESPONSE } from '@acme/shared';
import { randomUUID } from 'node:crypto';

import { getProductFactsService } from './product-facts-ai';
import { searchNutritionData } from './nutrition-websearch';
import { analyzeIngredients } from './ingredient-analysis-ai';
import {
  buildClassificationFromData,
  buildProductFacts,
  buildNutritionFacts,
  hasNutritionData,
} from '../domain/product-facts/build-product-facts';
import { computeAllProfileScores, type ScoreProfileInput } from '../domain/score-engine/compute-score';
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
 *   1. Get nutrition data from product (OFF/DB). If missing → web search.
 *   2. AI extracts classification facts (productType, diet, nutriGrade) — in parallel with step 1 if web search needed.
 *   3. Merge classification + nutrition → ProductFacts
 *   4. Deterministic score engine computes per-profile scores
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

    // Step 2: Get nutrition facts (product data first, web search fallback)
    const productHasNutrition = hasNutritionData(product);
    console.log(`[Job:${jobId}] 📊 Product has nutrition data: ${productHasNutrition}`);

    // Step 3: AI classification + nutrition resolution + ingredient analysis (all parallel)
    const selfProfile = profiles.find((p) => p.profileType === 'self');
    const selfOnboarding = selfProfile?.onboarding ?? DEFAULT_ONBOARDING_RESPONSE;

    console.log(`[Job:${jobId}] 🧪 Step 1 — Extracting classification${productHasNutrition ? '' : ' + searching nutrition'} + ingredients...`);
    const factsStart = Date.now();

    let classification;
    let nutritionFacts: NutritionFacts;
    let ingredientAnalysis: IngredientAnalysis | null = null;

    // Ingredient analysis always runs in parallel (never blocks main pipeline)
    const ingredientPromise = analyzeIngredients(product, selfOnboarding).catch((err) => {
      console.warn(`[Job:${jobId}] ⚠️ Ingredient analysis failed:`, err);
      return null;
    });

    if (productHasNutrition) {
      // Product has nutrition → just run AI classification + ingredients in parallel
      nutritionFacts = buildNutritionFacts(product);
      const [classificationResult, ingredientResult] = await Promise.all([
        getProductFactsService().extractClassification(product).catch(() => {
          console.warn(`[Job:${jobId}] ⚠️ AI classification failed, using deterministic fallback`);
          return buildClassificationFromData(product);
        }),
        ingredientPromise,
      ]);
      classification = classificationResult;
      ingredientAnalysis = ingredientResult;
    } else {
      // No nutrition → run AI classification + nutrition web search + ingredients in parallel
      const [classificationResult, webNutrition, ingredientResult] = await Promise.all([
        getProductFactsService().extractClassification(product).catch(() => {
          console.warn(`[Job:${jobId}] ⚠️ AI classification failed, using deterministic fallback`);
          return buildClassificationFromData(product);
        }),
        searchNutritionData(productName, product.brands, product.code),
        ingredientPromise,
      ]);

      classification = classificationResult;
      nutritionFacts = webNutrition ?? buildNutritionFacts(product);
      ingredientAnalysis = ingredientResult;

      if (webNutrition) {
        console.log(`[Job:${jobId}] 🌐 Nutrition found via web search`);
      } else {
        console.log(`[Job:${jobId}] ⚠️ No nutrition found anywhere — scoring with empty data`);
      }
    }

    // Step 4: Merge classification + nutrition → ProductFacts
    const facts: ProductFacts = buildProductFacts(classification, nutritionFacts);
    console.log(`[Job:${jobId}] ✅ Facts built  ${Date.now() - factsStart}ms  type=${facts.productType}`);

    // Step 5: Deterministic score engine
    console.log(`[Job:${jobId}] 🧮 Step 2 — Computing scores...`);
    const scoreStart = Date.now();
    const profileScores = computeAllProfileScores(facts, profiles);
    console.log(`[Job:${jobId}] ✅ Scores computed  ${Date.now() - scoreStart}ms`);

    for (const ps of profileScores) {
      console.log(`[Job:${jobId}]   "${ps.name}" → score=${ps.score} (${ps.fitLabel})  +${ps.positives.length}✓ -${ps.negatives.length}✗`);
    }

    // Step 6: Build final result
    if (ingredientAnalysis) {
      console.log(`[Job:${jobId}] 🧬 Ingredients analyzed — ${ingredientAnalysis.ingredients.length} items`);
    }

    const result: ProductAnalysisResult = {
      productFacts: facts,
      profiles: profileScores,
      ...(ingredientAnalysis ? { ingredientAnalysis } : {}),
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
