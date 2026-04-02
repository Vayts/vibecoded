import type { NormalizedProduct, ProductFacts } from '@acme/shared';

import { buildNutritionFacts, buildNutritionSummary } from './nutrition-utils';
import { detectProductType } from './product-type-utils';
import { detectDietCompatibilityWithReasons } from './diet-utils';

/**
 * Build ProductFacts from normalized product data WITHOUT calling AI.
 * Uses only structured data available from OpenFoodFacts / normalized product.
 * This is the deterministic fallback when AI is unavailable.
 */
export const buildProductFactsFromData = (product: NormalizedProduct): ProductFacts => {
  const nutritionFacts = buildNutritionFacts(product);
  const productType = detectProductType(product);
  const { compatibility, reasons } = detectDietCompatibilityWithReasons(product);

  return {
    productType,
    dietCompatibility: compatibility,
    dietCompatibilityReasons: reasons,
    nutritionFacts,
    nutritionSummary: buildNutritionSummary(nutritionFacts, productType),
    nutriGrade: product.scores.nutriscore_grade?.toLowerCase() as ProductFacts['nutriGrade'] ?? null,
  };
};
