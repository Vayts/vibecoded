import type { ProductRole } from '../types/product-role.types.js';
import type { NormalizedProductV2 } from '../types/normalized-product.types.js';

export interface ValidationRule {
  check: (product: NormalizedProductV2) => boolean;
}

export const VALIDATION_RULES: Partial<Record<ProductRole, ValidationRule>> = {
  oil: {
    check: (p) =>
      (p.nutrition.fatPer100g ?? 0) >= 70 &&
      (p.nutrition.carbsPer100g ?? 0) <= 5 &&
      (p.nutrition.proteinPer100g ?? 0) <= 5,
  },
  lean_protein: {
    check: (p) =>
      (p.nutrition.proteinPer100g ?? 0) >= 15 && (p.nutrition.saturatedFatPer100g ?? 100) <= 5,
  },
  sugary_drink: {
    check: (p) => (p.nutrition.sugarPer100g ?? 0) >= 5 && (p.nutrition.caloriesPer100g ?? 0) <= 100,
  },
  water_unsweetened_drink: {
    check: (p) =>
      (p.nutrition.sugarPer100g ?? 100) <= 1 && (p.nutrition.caloriesPer100g ?? 100) <= 10,
  },
  nuts_seeds: {
    check: (p) => (p.nutrition.fatPer100g ?? 0) >= 30 && (p.nutrition.proteinPer100g ?? 0) >= 8,
  },
};
