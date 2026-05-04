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

const SAVORY_SNACK_ROLES = new Set<ProductRole>(['savory_snack']);
const SWEET_SNACK_ROLES = new Set<ProductRole>(['sweet_snack', 'dessert', 'candy_chocolate']);

function getRoleSpecificPenalty(product: NormalizedProductV2, role: ProductRole): number {
  const caloriesPer100g = product.nutrition.caloriesPer100g ?? 0;
  const caloriesPerServing = product.nutrition.caloriesPerServing ?? 0;
  const sodiumPer100g = product.nutrition.sodiumPer100g ?? 0;
  const sugarPer100g = product.nutrition.sugarPer100g ?? 0;
  const proteinPer100g = product.nutrition.proteinPer100g ?? 0;
  const fiberPer100g = product.nutrition.fiberPer100g ?? 0;
  const additivesCount = product.additives.length;

  let penalty = 0;

  if (SAVORY_SNACK_ROLES.has(role)) {
    if (caloriesPer100g >= 500) penalty += 14;
    else if (caloriesPer100g >= 450) penalty += 10;

    if (sodiumPer100g >= 0.6) penalty += 10;
    else if (sodiumPer100g >= 0.4) penalty += 6;

    if (additivesCount >= 4) penalty += 10;
    else if (additivesCount >= 2) penalty += 6;

    if (proteinPer100g < 7) penalty += 4;
    if (fiberPer100g < 3) penalty += 4;
  }

  if (SWEET_SNACK_ROLES.has(role)) {
    if (sugarPer100g >= 30) penalty += 16;
    else if (sugarPer100g >= 20) penalty += 10;

    if (caloriesPer100g >= 450) penalty += 12;
    else if (caloriesPer100g >= 350) penalty += 8;

    if (additivesCount >= 4) penalty += 8;
    else if (additivesCount >= 2) penalty += 5;

    if (fiberPer100g < 2) penalty += 4;
  }

  if (role === 'sugary_drink') {
    if (sugarPer100g >= 10) penalty += 18;
    else if (sugarPer100g >= 6) penalty += 12;

    if (caloriesPerServing >= 120) penalty += 8;
    if (additivesCount >= 2) penalty += 4;
  }

  return penalty;
}

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
  const { additives, ingredients } = product;

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
  const rolePenalty = getRoleSpecificPenalty(product, effectiveRole);
  const finalScore = clampScore(score - rolePenalty);

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
    rolePenalty,
    subScores: allSubScores,
    weights: rule.weights,
    ignoredFacts: rule.ignoredFacts ?? [],
    portionGuidanceFacts: rule.portionGuidanceFacts ?? [],
    reasonThresholds: rule.reasonThresholds ?? {},
    missingMetrics,
    ingredientsCount: ingredients.length,
    additivesCount: additives.length,
  };

  return { score: finalScore, positives, negatives, details };
}
