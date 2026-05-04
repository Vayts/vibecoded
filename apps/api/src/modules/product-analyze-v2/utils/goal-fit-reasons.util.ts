import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import type { ProductRole } from '../types/product-role.types.js';
import type {
  GoalRoleWeights,
  NutrientSubScores,
  ProductRoleConfig,
} from '../types/goal-fit.types.js';
import type { MainGoal } from '../types/scoring.types.js';
import { shouldSuppressLowRiskPositives } from './role-config.util.js';

interface GoalFitReasonContext {
  role: ProductRole;
  roleConfig: ProductRoleConfig;
  goal: MainGoal | null;
  product: NormalizedProductV2;
  subScores: NutrientSubScores;
  weights: GoalRoleWeights;
  usedServingSize: boolean;
}

interface ReasonCandidate {
  text: string;
  priority: number;
}

const POSITIVE_THRESHOLD: Record<'low' | 'medium' | 'high', number> = {
  low: 92,
  medium: 82,
  high: 72,
};

const NEGATIVE_THRESHOLD: Record<'low' | 'medium' | 'high', number> = {
  low: 32,
  medium: 42,
  high: 52,
};

const INTENSITY_PRIORITY: Record<'none' | 'low' | 'medium' | 'high', number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

const LOW_RISK_POSITIVE_KEYS = new Set([
  'lowSugar',
  'lowSodium',
  'lowSaturatedFat',
  'goodFatProfile',
  'lowAdditives',
]);

function pushUniqueReason(target: ReasonCandidate[], candidate: ReasonCandidate): void {
  if (!target.some((item) => item.text === candidate.text)) {
    target.push(candidate);
  }
}

function createPositiveReason(
  target: ReasonCandidate[],
  key: keyof ProductRoleConfig['reward'],
  intensity: ProductRoleConfig['reward'][keyof ProductRoleConfig['reward']],
  score: number | null,
  text: string,
  suppressLowRisk: boolean,
): void {
  if (intensity === 'none' || score === null) {
    return;
  }

  if (suppressLowRisk && LOW_RISK_POSITIVE_KEYS.has(key) && intensity !== 'high' && score < 96) {
    return;
  }

  if (score < POSITIVE_THRESHOLD[intensity]) {
    return;
  }

  pushUniqueReason(target, {
    text,
    priority: INTENSITY_PRIORITY[intensity] * 10 + Math.round(score / 10),
  });
}

function createNegativeReason(
  target: ReasonCandidate[],
  intensity: ProductRoleConfig['penalize'][keyof ProductRoleConfig['penalize']],
  score: number | null,
  text: string,
): void {
  if (intensity === 'none' || score === null) {
    return;
  }

  if (score > NEGATIVE_THRESHOLD[intensity]) {
    return;
  }

  pushUniqueReason(target, {
    text,
    priority: INTENSITY_PRIORITY[intensity] * 10 + Math.round((100 - score) / 10),
  });
}

function getCalorieReasonText(context: GoalFitReasonContext): string {
  if (context.usedServingSize) {
    if (context.roleConfig.group === 'fat' || context.roleConfig.group === 'condiment') {
      return 'Calorie-dense, portion size matters';
    }

    return 'High calories per serving';
  }

  return 'High calorie density';
}

function maybeAddIngredientSimplicityReasons(
  context: GoalFitReasonContext,
  positives: ReasonCandidate[],
  negatives: ReasonCandidate[],
): void {
  const weight = context.weights.ingredientSimplicity ?? 0;
  const score = context.subScores.ingredientSimplicity;

  if (weight < 0.1 || score === null) {
    return;
  }

  if (score >= 80) {
    pushUniqueReason(positives, {
      text: 'Simple ingredient list',
      priority: 18,
    });
  }

  if (score <= 40) {
    pushUniqueReason(negatives, {
      text: 'Long ingredient list',
      priority: 18,
    });
  }
}

function finalizeReasons(reasons: ReasonCandidate[]): string[] {
  return reasons
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 4)
    .map((reason) => reason.text);
}

export function buildGoalFitReasons(context: GoalFitReasonContext): {
  positives: string[];
  negatives: string[];
} {
  const positives: ReasonCandidate[] = [];
  const negatives: ReasonCandidate[] = [];
  const suppressLowRisk = shouldSuppressLowRiskPositives(context.roleConfig);
  const caloriesScore = context.usedServingSize
    ? context.subScores.caloriesPerServing
    : (context.subScores.calorieDensity ?? context.subScores.caloriesPerServing);

  createPositiveReason(
    positives,
    'protein',
    context.roleConfig.reward.protein,
    context.subScores.protein,
    'Good protein content',
    suppressLowRisk,
  );
  createPositiveReason(
    positives,
    'fiber',
    context.roleConfig.reward.fiber,
    context.subScores.fiber,
    'Good fiber content',
    suppressLowRisk,
  );
  createPositiveReason(
    positives,
    'lowSugar',
    context.roleConfig.reward.lowSugar,
    context.subScores.sugar,
    'Low sugar',
    suppressLowRisk,
  );
  createPositiveReason(
    positives,
    'lowSodium',
    context.roleConfig.reward.lowSodium,
    context.subScores.sodium,
    'Very low sodium',
    suppressLowRisk,
  );
  createPositiveReason(
    positives,
    'lowSaturatedFat',
    context.roleConfig.reward.lowSaturatedFat,
    context.subScores.saturatedFat,
    'Low saturated fat',
    suppressLowRisk,
  );
  createPositiveReason(
    positives,
    'goodFatProfile',
    context.roleConfig.reward.goodFatProfile,
    context.subScores.unsaturatedFatRatio,
    'Good fat profile',
    suppressLowRisk,
  );
  createPositiveReason(
    positives,
    'lowAdditives',
    context.roleConfig.reward.lowAdditives,
    context.subScores.additives,
    'Few or no additives',
    suppressLowRisk,
  );

  createNegativeReason(
    negatives,
    context.roleConfig.penalize.calories,
    caloriesScore,
    getCalorieReasonText(context),
  );
  createNegativeReason(
    negatives,
    context.roleConfig.penalize.sugar,
    context.subScores.sugar,
    context.role === 'juice_smoothie' ? 'High sugar for a juice or smoothie' : 'High sugar content',
  );
  createNegativeReason(
    negatives,
    context.roleConfig.penalize.sodium,
    context.subScores.sodium,
    'High sodium content',
  );
  createNegativeReason(
    negatives,
    context.roleConfig.penalize.saturatedFat,
    context.subScores.saturatedFat,
    'High saturated fat',
  );
  createNegativeReason(
    negatives,
    context.roleConfig.penalize.fat,
    context.subScores.fat,
    'High total fat',
  );
  createNegativeReason(
    negatives,
    context.roleConfig.penalize.additives,
    context.subScores.additives,
    'Multiple additives',
  );

  maybeAddIngredientSimplicityReasons(context, positives, negatives);

  return {
    positives: finalizeReasons(positives),
    negatives: finalizeReasons(negatives),
  };
}
