import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import type { NutritionResult } from '../types/scoring.types.js';
import type { ProductRole } from '../types/product-role.types.js';
import {
  scoreLowerIsBetter,
  scoreHigherIsBetter,
  weightedAverage,
  clampScore,
} from './nutrient-score.util.js';
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
  const portionGuidanceFacts = new Set<NutritionFactKey>(rule.portionGuidanceFacts ?? []);

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

  const positives: string[] = [];
  const negatives: string[] = [];

  // Universal positives (always shown regardless of role)
  if (!ignoredFacts.has('protein') && (nutrition.proteinPer100g ?? 0) >= 15) {
    positives.push('High protein content');
  }
  if (!ignoredFacts.has('fiber') && (nutrition.fiberPer100g ?? 0) >= 5) {
    positives.push('Good fiber content');
  }
  if (ingredients.length <= 5 && ingredients.length > 0) {
    positives.push('Minimal ingredients');
  }
  if ((nutrition.sugarPer100g ?? 100) <= 2) {
    positives.push('No sugar');
  }
  if ((nutrition.sodiumPer100g ?? 100) <= 0.1) {
    positives.push('Very low sodium');
  }
  const fat = nutrition.fatPer100g ?? 0;
  const satFat = nutrition.saturatedFatPer100g ?? 0;
  if (fat > 0 && satFat < fat * 0.3) {
    positives.push('High unsaturated fat');
  }
  if (additives.length === 0 && ingredients.length > 0) {
    positives.push('No additives');
  }

  // Universal negatives (skipped for ignored facts)
  if (!ignoredFacts.has('sugar')) {
    if ((nutrition.sugarPer100g ?? 0) >= 20) negatives.push('Very high sugar content');
    else if ((nutrition.sugarPer100g ?? 0) >= 10) negatives.push('High sugar content');
  }
  if (!ignoredFacts.has('sodium') && (nutrition.sodiumPer100g ?? 0) >= 0.6) {
    negatives.push('High sodium content');
  }
  if (!ignoredFacts.has('saturatedFat') && (nutrition.saturatedFatPer100g ?? 0) >= 10) {
    negatives.push('Contains saturated fat');
  }

  // Calorie density: show as portion guidance if in portionGuidanceFacts, else as negative
  if ((nutrition.caloriesPer100g ?? 0) >= 400) {
    if (portionGuidanceFacts.has('calorieDensity') || ignoredFacts.has('calorieDensity')) {
      negatives.push('High calorie density, portion size matters');
    } else {
      negatives.push('High calorie density');
    }
  }

  if (additives.length >= 5) negatives.push('Multiple additives');
  else if (additives.length >= 3) negatives.push('Contains several additives');

  const details: Record<string, unknown> = {
    role,
    effectiveRole,
    subScores: allSubScores,
    weights: rule.weights,
    ignoredFacts: rule.ignoredFacts ?? [],
    portionGuidanceFacts: rule.portionGuidanceFacts ?? [],
    missingMetrics,
    ingredientsCount: ingredients.length,
    additivesCount: additives.length,
  };

  return { score, positives, negatives, details };
}
