import {
  FALLBACK_ROLE,
  MIN_AI_CONFIDENCE,
  PRODUCT_ROLE_SET,
} from '../../../constants/product-roles.constants.js';
import type {
  AnalyzeBarcodeV2ProfileResult,
  AnalyzeBarcodeV2Response,
} from '../../../types/analyze-product-v2.types.js';
import type {
  AiCanIHaveThisStatus,
  AiProfileInfo,
  AiProductAnalyzeV2Result,
} from '../../../types/ai-analyze.types.js';
import type {
  ProfileAnalysisResult,
  ProfileInputForScoring,
  RoleResult,
} from '../../../types/scoring.types.js';
import { buildProfileScoreReasons } from '../../../utils/build-profile-score-reasons.util.js';
import { calculateGoalFitScore } from '../../../utils/calculate-goal-fit-score.util.js';
import { calculateNutritionScore } from '../../../utils/calculate-nutrition-score.util.js';
import { calculateOverallScore } from '../../../utils/calculate-overall-score.util.js';
import { calculateSafetyScore } from '../../../utils/calculate-safety-score.util.js';
import { normalizeOpenFoodFactsProduct } from '../../../utils/normalize-open-food-facts-product.util.js';
import type { AiProfileInfoWithIngredients, IngredientCompatibilityItem } from './ai-contracts.js';

type BuildProfileAiResult = {
  allergenDetections: AnalyzeBarcodeV2ProfileResult['ai']['allergenDetections'];
  restrictionDetections: AnalyzeBarcodeV2ProfileResult['ai']['restrictionDetections'];
  traceDetections: AnalyzeBarcodeV2ProfileResult['ai']['traceDetections'];
  ingredients: IngredientCompatibilityItem[];
  canIHaveThis: AnalyzeBarcodeV2ProfileResult['ai']['canIHaveThis'];
};

type CanIHaveThisStatusInput = Pick<
  AnalyzeBarcodeV2ProfileResult['ai'],
  'allergenDetections' | 'restrictionDetections' | 'traceDetections' | 'canIHaveThis'
>;

const CAN_I_HAVE_THIS_STATUS_SET = new Set<AiCanIHaveThisStatus>(['yes', 'warning', 'no']);

function isCanIHaveThisStatus(value: unknown): value is AiCanIHaveThisStatus {
  return typeof value === 'string' && CAN_I_HAVE_THIS_STATUS_SET.has(value as AiCanIHaveThisStatus);
}

function resolveFallbackCanIHaveThisStatus(input: CanIHaveThisStatusInput): AiCanIHaveThisStatus {
  const hasDirectAllergen = input.allergenDetections.some((detection) => detection.detected);
  const hasHardRestriction = input.restrictionDetections.some(
    (detection) => detection.status === 'not_compatible',
  );

  if (hasDirectAllergen || hasHardRestriction) {
    return 'no';
  }

  const hasRestrictionConcern = input.restrictionDetections.some(
    (detection) => detection.status !== 'compatible',
  );
  const hasAllergyTrace = input.traceDetections.some((detection) => Boolean(detection.allergy));

  if (!hasRestrictionConcern && hasAllergyTrace) {
    return 'warning';
  }

  return input.canIHaveThis.can ? 'yes' : 'no';
}

function buildCanIHaveThisAnswer(
  input: CanIHaveThisStatusInput,
): AnalyzeBarcodeV2ProfileResult['ai']['canIHaveThis'] {
  const status = isCanIHaveThisStatus(input.canIHaveThis.status)
    ? input.canIHaveThis.status
    : resolveFallbackCanIHaveThisStatus(input);

  return {
    can: status !== 'no',
    status,
    reason: input.canIHaveThis.reason,
  };
}

export function withResolvedCanIHaveThisStatuses(
  response: AnalyzeBarcodeV2Response,
): AnalyzeBarcodeV2Response {
  return {
    ...response,
    profiles: response.profiles.map((profile) => ({
      ...profile,
      ai: {
        ...profile.ai,
        canIHaveThis: buildCanIHaveThisAnswer(profile.ai),
      },
    })),
  };
}

export function resolveProductRole(aiProduct: AiProductAnalyzeV2Result['product']): RoleResult {
  if (PRODUCT_ROLE_SET.has(aiProduct.role) && aiProduct.confidence >= MIN_AI_CONFIDENCE) {
    return {
      value: aiProduct.role,
      source: 'ai',
      confidence: aiProduct.confidence,
      validated: true,
      evidence: aiProduct.evidence,
    };
  }

  return {
    value: FALLBACK_ROLE,
    source: 'fallback',
    confidence: aiProduct.confidence,
    validated: true,
    evidence:
      aiProduct.confidence < MIN_AI_CONFIDENCE
        ? [`AI confidence ${aiProduct.confidence.toFixed(2)} below threshold, fallback applied`]
        : ['AI classification unavailable, fallback applied'],
  };
}

export function buildProfileAnalysis(
  profile: ProfileInputForScoring,
  role: RoleResult,
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
  nutritionResult: ReturnType<typeof calculateNutritionScore>,
  aiProfileInfo: AiProfileInfoWithIngredients | null,
): ProfileAnalysisResult {
  const safety = calculateSafetyScore(profile, product, aiProfileInfo as AiProfileInfo | null);
  const goalFit = calculateGoalFitScore(profile.mainGoal, role.value, product);
  const scoreReasons = buildProfileScoreReasons({
    product,
    role: role.value,
    safety,
    aiProfileInfo: aiProfileInfo as AiProfileInfo | null,
  });
  const overall = calculateOverallScore(
    safety,
    goalFit,
    nutritionResult,
    aiProfileInfo?.overallSummary ?? null,
  );

  return {
    profileType: profile.profileType,
    profileId: profile.profileId,
    displayName: profile.displayName,
    role,
    safety,
    goalFit,
    nutrition: nutritionResult,
    positives: scoreReasons.positives,
    negatives: scoreReasons.negatives,
    overall,
  };
}

function buildProfileAi(aiProfileInfo: AiProfileInfoWithIngredients | null): BuildProfileAiResult {
  const canIHaveThis: BuildProfileAiResult['canIHaveThis'] = aiProfileInfo?.canIHaveThis ?? {
    can: false,
    status: 'no',
    reason: 'I cannot confirm this product is suitable for you.',
  };

  const profileAi = {
    allergenDetections: aiProfileInfo?.allergenDetections ?? [],
    restrictionDetections: aiProfileInfo?.restrictionDetections ?? [],
    traceDetections: aiProfileInfo?.traceDetections ?? [],
    ingredients: aiProfileInfo?.ingredients ?? [],
    canIHaveThis,
  };

  return {
    ...profileAi,
    canIHaveThis: buildCanIHaveThisAnswer(profileAi),
  };
}

export function buildProfileResult(
  profile: ProfileInputForScoring,
  analysis: ProfileAnalysisResult,
  aiProfileInfo: AiProfileInfoWithIngredients | null,
): AnalyzeBarcodeV2ProfileResult {
  return {
    profileId: profile.profileId,
    type: profile.profileType,
    displayName: profile.displayName,
    analysis: {
      safety: analysis.safety,
      goalFit: analysis.goalFit,
      nutrition: analysis.nutrition,
      positives: analysis.positives,
      negatives: analysis.negatives,
      overall: analysis.overall,
    },
    ai: buildProfileAi(aiProfileInfo),
  };
}
