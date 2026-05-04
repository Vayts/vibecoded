import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import type { NutritionResult } from '../types/scoring.types.js';
import type { ProductRole } from '../types/product-role.types.js';
import {
  scoreLowerIsBetter,
  scoreHigherIsBetter,
  weightedAverage,
  clampScore,
} from './nutrient-score.util.js';
import { buildNutritionDisplayReasons } from './build-nutrition-display-reasons.util.js';
import {
  NUTRITION_ROLE_RULES,
  FALLBACK_NUTRITION_ROLE,
  type NutritionFactKey,
} from '../constants/nutrition-role-rules.constants.js';

function buildAllSubScores(product: NormalizedProductV2): Record<NutritionFactKey, number | null> {
  const { nutrition, additives, ingredients } = product;
  const fat = nutrition.fatPer100g ?? null;
  const satFat = nutrition.saturatedFatPer100g ?? null;
  const unsatRatio =
    fat !== null && fat > 0 && satFat !== null
      ? Math.max(0, Math.min(1, (fat - satFat) / fat))
      : null;

  return {
    protein: scoreHigherIsBetter(nutrition.proteinPer100g, 0, 30),
    fiber: scoreHigherIsBetter(nutrition.fiberPer100g, 0, 10),
    sugar: scoreLowerIsBetter(nutrition.sugarPer100g, 0, 50),
    sodium: scoreLowerIsBetter(nutrition.sodiumPer100g, 0, 2),
    saturatedFat: scoreLowerIsBetter(nutrition.saturatedFatPer100g, 0, 30),
    calorieDensity: scoreLowerIsBetter(nutrition.caloriesPer100g, 0, 500),
    caloriesPerServing: scoreLowerIsBetter(nutrition.caloriesPerServing, 0, 300),
    additives: scoreLowerIsBetter(additives.length, 0, 10),
    ingredientSimplicity:
      ingredients.length > 0 && ingredients.length <= 5
        ? 100
        : scoreLowerIsBetter(ingredients.length, 0, 30),
    unsaturatedFatRatio: unsatRatio === null ? null : clampScore(unsatRatio * 100),
    fat: fat !== null ? clampScore(Math.min(fat / 100, 1) * 100) : null,
  };
}

export function calculateNutritionScore(
  product: NormalizedProductV2,
  role: ProductRole = 'generic_food',
): NutritionResult {
  const { nutrition, additives, ingredients } = product;

  const effectiveRole: ProductRole =
    NUTRITION_ROLE_RULES[role] !== undefined ? role : FALLBACK_NUTRITION_ROLE;

  const rule =
    NUTRITION_ROLE_RULES[effectiveRole] ?? NUTRITION_ROLE_RULES[FALLBACK_NUTRITION_ROLE]!;
  const ignoredFacts = new Set<NutritionFactKey>(rule.ignoredFacts ?? []);
  const allSubScores = buildAllSubScores(product);

  // Build weighted scores excluding ignored facts
  const filteredScores: Record<string, number | null> = {};
  for (const [key] of Object.entries(rule.weights)) {
    if (ignoredFacts.has(key as NutritionFactKey)) continue;
    filteredScores[key] = allSubScores[key as NutritionFactKey] ?? null;
  }

  const filteredWeights: Record<string, number> = {};
  for (const [key, weight] of Object.entries(rule.weights)) {
    if (ignoredFacts.has(key as NutritionFactKey)) continue;
    filteredWeights[key] = weight;
  }

  const { score, missingMetrics } = weightedAverage(filteredScores, filteredWeights);

  const displayReasons = buildNutritionDisplayReasons(product, effectiveRole);
  const positives = displayReasons
    .filter((reason) => reason.kind === 'positive')
    .map((reason) => reason.description);
  const negatives = displayReasons
    .filter((reason) => reason.kind === 'negative')
    .map((reason) => reason.description);

  const details: Record<string, unknown> = {
    role,
    effectiveRole,
    subScores: allSubScores,
    weights: rule.weights,
    ignoredFacts: rule.ignoredFacts ?? [],
    portionGuidanceFacts: rule.portionGuidanceFacts ?? [],
    reasonThresholds: rule.reasonThresholds ?? {},
    missingMetrics,
    ingredientsCount: ingredients.length,
    additivesCount: additives.length,
  };

  return { score, positives, negatives, details };
}
