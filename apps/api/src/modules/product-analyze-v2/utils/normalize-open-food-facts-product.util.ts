import type { NormalizedProduct } from '@acme/shared';
import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import { parseServingSize, calculateCaloriesPerServing } from './serving-size.util.js';

const UNKNOWN_CATEGORY_MARKERS = [
  'unknown',
  'all-products',
  'agribalyse',
  'ciqual',
  'categories-unknown',
];

const normalizeDigits = (value: string): string => value.replace(/\D/g, '').replace(/^0+/, '');

const hasUsefulText = (value: string | null, barcode: string): boolean => {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return false;
  }

  if (/^[\d\s-]+$/.test(trimmed)) {
    return false;
  }

  const valueDigits = normalizeDigits(trimmed);
  const barcodeDigits = normalizeDigits(barcode);
  return !valueDigits || !barcodeDigits || valueDigits !== barcodeDigits;
};

const hasUsefulImage = (value: string | null): boolean => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 && trimmed !== '/' && trimmed !== '/null';
};

const hasUsefulCategory = (categories: string[]): boolean => {
  return categories.some((category) => {
    const normalized = category.trim().toLowerCase();
    return (
      normalized.length > 0 &&
      !UNKNOWN_CATEGORY_MARKERS.some((marker) => normalized.includes(marker))
    );
  });
};

const hasUsefulNutrition = (nutrition: NormalizedProductV2['nutrition']): boolean => {
  return Object.values(nutrition).some(
    (value) => typeof value === 'number' && Number.isFinite(value),
  );
};

export function hasRequiredOpenFoodFactsBarcodeData(product: NormalizedProductV2): boolean {
  return (
    hasUsefulText(product.name, product.barcode) &&
    hasUsefulText(product.brand, product.barcode) &&
    hasUsefulNutrition(product.nutrition)
  );
}

export function hasEnoughProductInformation(product: NormalizedProductV2): boolean {
  return (
    hasUsefulText(product.name, product.barcode) ||
    hasUsefulText(product.brand, product.barcode) ||
    hasUsefulImage(product.imageUrl) ||
    product.ingredients.length > 0 ||
    product.allergens.length > 0 ||
    product.traces.length > 0 ||
    product.additives.length > 0 ||
    hasUsefulCategory(product.categories) ||
    hasUsefulNutrition(product.nutrition)
  );
}

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
