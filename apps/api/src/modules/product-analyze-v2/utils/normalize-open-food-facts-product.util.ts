import type { NormalizedProduct } from '@acme/shared';
import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import { parseServingSize, calculateCaloriesPerServing } from './serving-size.util.js';

export function normalizeOpenFoodFactsProduct(
  barcode: string,
  raw: NormalizedProduct,
): NormalizedProductV2 {
  const { grams: servingSizeGrams, ml: servingSizeMl } = parseServingSize(raw.serving_size);

  const caloriesPer100g = raw.nutrition.energy_kcal_100g;
  const caloriesPerServing = calculateCaloriesPerServing(
    caloriesPer100g,
    servingSizeGrams,
    servingSizeMl,
  );

  return {
    barcode,
    name: raw.product_name ?? null,
    brand: raw.brands ?? null,
    imageUrl: raw.images?.front_url ?? raw.image_url ?? null,
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
    allergens: Array.isArray(raw.allergens) ? raw.allergens : [],
    traces: Array.isArray(raw.traces) ? raw.traces : [],
    additives: Array.isArray(raw.additives) ? raw.additives : [],
    categories: Array.isArray(raw.category_tags) ? raw.category_tags : [],
    servingSizeText: raw.serving_size ?? null,
    servingSizeGrams,
    servingSizeMl,
    nutrition: {
      caloriesPer100g,
      caloriesPerServing,
      proteinPer100g: raw.nutrition.proteins_100g,
      carbsPer100g: raw.nutrition.carbohydrates_100g,
      sugarPer100g: raw.nutrition.sugars_100g,
      fatPer100g: raw.nutrition.fat_100g,
      saturatedFatPer100g: raw.nutrition.saturated_fat_100g,
      fiberPer100g: raw.nutrition.fiber_100g,
      sodiumPer100g: raw.nutrition.sodium_100g,
      saltPer100g: raw.nutrition.salt_100g,
    },
  };
}
