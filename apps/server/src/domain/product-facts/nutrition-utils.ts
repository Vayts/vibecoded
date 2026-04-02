import type { NormalizedProduct, NutritionFacts, NutritionSummary, NutritionLevel, ProductType } from '@acme/shared';

/**
 * Extract structured nutrition facts from normalized product data.
 */
export const buildNutritionFacts = (product: NormalizedProduct): NutritionFacts => {
  const n = product.nutrition;
  return {
    calories: n.energy_kcal_100g,
    protein: n.proteins_100g,
    fat: n.fat_100g,
    saturatedFat: n.saturated_fat_100g,
    carbs: n.carbohydrates_100g,
    sugars: n.sugars_100g,
    fiber: n.fiber_100g,
    salt: n.salt_100g,
    sodium: n.sodium_100g,
  };
};

const classifyLevel = (
  value: number | null,
  low: number,
  high: number,
): NutritionLevel => {
  if (value == null) return 'unknown';
  if (value <= low) return 'low';
  if (value > high) return 'high';
  return 'moderate';
};

const isBeverage = (productType: ProductType | null): boolean =>
  productType === 'beverage';

/**
 * Build nutrition summary with category-aware thresholds.
 * Beverages use stricter thresholds for sugar and calories.
 */
export const buildNutritionSummary = (
  facts: NutritionFacts,
  productType: ProductType | null,
): NutritionSummary => {
  const beverage = isBeverage(productType);

  return {
    sugarLevel: classifyLevel(facts.sugars, beverage ? 2.5 : 5, beverage ? 6 : 12),
    saltLevel: classifyLevel(facts.salt, 0.3, 1.0),
    calorieLevel: classifyLevel(facts.calories, beverage ? 20 : 100, beverage ? 50 : 250),
    proteinLevel: classifyLevel(facts.protein, 3, 8),
    fiberLevel: classifyLevel(facts.fiber, 2, 5),
    saturatedFatLevel: classifyLevel(facts.saturatedFat, 1.5, 5),
  };
};
