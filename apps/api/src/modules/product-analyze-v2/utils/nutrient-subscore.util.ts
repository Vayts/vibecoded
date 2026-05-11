import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import type { NutrientSubScores, ProductRoleConfig } from '../types/goal-fit.types.js';
import { clampScore, scoreHigherIsBetter, scoreLowerIsBetter } from './nutrient-score.util.js';
import { calculateCaloriesPerServing } from './serving-size.util.js';
import { getOilNutritionFallbackValues } from './oil-nutrition-fallback.util.js';

function getWaterBaselineSugar(
  product: NormalizedProductV2,
  roleConfig: ProductRoleConfig,
): number | null {
  if (roleConfig.role !== 'water') {
    return product.nutrition.sugarPer100g;
  }

  return product.nutrition.sugarPer100g ?? 0;
}

function getWaterBaselineCaloriesPer100g(
  product: NormalizedProductV2,
  roleConfig: ProductRoleConfig,
): number | null {
  if (roleConfig.role !== 'water') {
    return product.nutrition.caloriesPer100g;
  }

  return product.nutrition.caloriesPer100g ?? 0;
}

function getCaloriesPerServingValue(product: NormalizedProductV2): number | null {
  if (product.nutrition.caloriesPerServing !== null) {
    return product.nutrition.caloriesPerServing;
  }

  return calculateCaloriesPerServing(
    product.nutrition.caloriesPer100g,
    product.servingSizeGrams,
    product.servingSizeMl,
  );
}

function getIngredientSimplicityScore(ingredientsCount: number): number | null {
  if (ingredientsCount <= 0) {
    return null;
  }

  if (ingredientsCount <= 5) {
    return 100;
  }

  return scoreLowerIsBetter(ingredientsCount, 5, 20);
}

function getUnsaturatedFatRatioScore(product: NormalizedProductV2): number | null {
  const oilFallback = getOilNutritionFallbackValues(product);
  const fat = product.nutrition.fatPer100g ?? oilFallback?.fatPer100g ?? null;
  const saturatedFat =
    product.nutrition.saturatedFatPer100g ?? oilFallback?.saturatedFatPer100g ?? null;

  if (fat === null || fat <= 0) {
    return null;
  }

  const unsaturatedFat = Math.max(0, fat - (saturatedFat ?? 0));
  return clampScore((unsaturatedFat / fat) * 100);
}

export function shouldUseServingSize(
  product: NormalizedProductV2,
  roleConfig: ProductRoleConfig,
): boolean {
  if (!roleConfig.useServingSize) {
    return false;
  }

  if (roleConfig.role === 'oil') {
    return getOilNutritionFallbackValues(product)?.caloriesPerServing !== null;
  }

  return getCaloriesPerServingValue(product) !== null;
}

export function buildNutrientSubScores(
  product: NormalizedProductV2,
  roleConfig: ProductRoleConfig,
): NutrientSubScores {
  const oilFallback = roleConfig.role === 'oil' ? getOilNutritionFallbackValues(product) : null;
  const caloriesPer100gValue = getWaterBaselineCaloriesPer100g(product, roleConfig);
  const sugarPer100gValue = getWaterBaselineSugar(product, roleConfig);
  const caloriesPerServingValue =
    roleConfig.role === 'water'
      ? getCaloriesPerServingValue({
          ...product,
          nutrition: {
            ...product.nutrition,
            caloriesPer100g: caloriesPer100gValue,
          },
        })
      : (oilFallback?.caloriesPerServing ?? getCaloriesPerServingValue(product));
  const usedServingSize = shouldUseServingSize(product, roleConfig);
  const fatPer100gValue = product.nutrition.fatPer100g ?? oilFallback?.fatPer100g ?? null;
  const saturatedFatPer100gValue =
    product.nutrition.saturatedFatPer100g ?? oilFallback?.saturatedFatPer100g ?? null;
  const sodiumPer100gValue = product.nutrition.sodiumPer100g ?? oilFallback?.sodiumPer100g ?? null;
  const effectiveSugarPer100gValue = sugarPer100gValue ?? oilFallback?.sugarPer100g ?? null;

  return {
    caloriesPerServing: scoreLowerIsBetter(
      usedServingSize ? caloriesPerServingValue : caloriesPer100gValue,
      0,
      400,
    ),
    calorieDensity: scoreLowerIsBetter(caloriesPer100gValue, 0, 500),
    protein: scoreHigherIsBetter(product.nutrition.proteinPer100g, 0, 20),
    sugar: scoreLowerIsBetter(effectiveSugarPer100gValue, 0, 20),
    fiber: scoreHigherIsBetter(product.nutrition.fiberPer100g, 0, 6),
    fat: scoreLowerIsBetter(fatPer100gValue, 0, 40),
    saturatedFat: scoreLowerIsBetter(saturatedFatPer100gValue, 0, 20),
    sodium: scoreLowerIsBetter(sodiumPer100gValue, 0, 2),
    additives: scoreLowerIsBetter(product.additives.length, 0, 5),
    ingredientSimplicity: getIngredientSimplicityScore(product.ingredients.length),
    unsaturatedFatRatio: getUnsaturatedFatRatioScore(product),
  };
}
