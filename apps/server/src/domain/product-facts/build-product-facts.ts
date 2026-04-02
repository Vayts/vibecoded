import type { NormalizedProduct, ProductFacts, NutritionFacts } from '@acme/shared';

import { buildNutritionFacts, buildNutritionSummary } from './nutrition-utils';
import { detectProductType } from './product-type-utils';
import { detectDietCompatibilityWithReasons } from './diet-utils';
import type { AiClassification } from './schema';

/**
 * Build classification-only facts from normalized product data WITHOUT calling AI.
 * Used as deterministic fallback when AI is unavailable.
 */
export const buildClassificationFromData = (product: NormalizedProduct): AiClassification => {
  const productType = detectProductType(product);
  const { compatibility, reasons } = detectDietCompatibilityWithReasons(product);

  return {
    productType,
    dietCompatibility: compatibility,
    dietCompatibilityReasons: reasons,
    nutriGrade: product.scores.nutriscore_grade?.toLowerCase() as AiClassification['nutriGrade'] ?? null,
  };
};

/**
 * Check whether a NormalizedProduct has meaningful nutrition data.
 * Returns false if all values are null/zero.
 */
export const hasNutritionData = (product: NormalizedProduct): boolean => {
  const n = product.nutrition;
  return [
    n.energy_kcal_100g,
    n.proteins_100g,
    n.fat_100g,
    n.carbohydrates_100g,
    n.sugars_100g,
  ].some((v) => v != null && v > 0);
};

/**
 * Merge AI classification + product nutrition data → final ProductFacts.
 * Nutrition always comes from product data (OFF/DB/websearch), never from AI.
 */
export const buildProductFacts = (
  classification: AiClassification,
  nutritionFacts: NutritionFacts,
): ProductFacts => {
  return {
    productType: classification.productType,
    dietCompatibility: classification.dietCompatibility,
    dietCompatibilityReasons: classification.dietCompatibilityReasons,
    nutritionFacts,
    nutritionSummary: buildNutritionSummary(nutritionFacts, classification.productType),
    nutriGrade: classification.nutriGrade,
  };
};

/**
 * Build nutrition facts from a NormalizedProduct.
 * Re-exports buildNutritionFacts for convenience.
 */
export { buildNutritionFacts } from './nutrition-utils';
