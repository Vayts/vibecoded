import type { NormalizedProduct } from '@acme/shared';
import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import type { PackagePhotoExtractionResult } from '../types/analyze-photo-v2.types.js';

const toNullableText = (value: string | null): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const toCategoryText = (value: PackagePhotoExtractionResult['productRole']): string | null => {
  return value ? value.replace(/_/g, ' ') : null;
};

const toCategoryTags = (value: PackagePhotoExtractionResult['productRole']): string[] => {
  return value ? [value] : [];
};

export const createPackagePhotoNormalizedProduct = (input: {
  barcode: string;
  extraction: PackagePhotoExtractionResult;
}): NormalizedProduct => {
  const { barcode, extraction } = input;

  return {
    code: barcode,
    product_name: toNullableText(extraction.productName),
    product_name_english: null,
    brands: toNullableText(extraction.productBrand),
    image_url: null,
    ingredients_text: extraction.ingredients.length ? extraction.ingredients.join(', ') : null,
    nutriscore_grade: null,
    categories: toCategoryText(extraction.productRole),
    quantity: null,
    serving_size: null,
    ingredients: extraction.ingredients,
    allergens: [],
    additives: [],
    additives_count: 0,
    traces: extraction.traces,
    countries: [],
    category_tags: toCategoryTags(extraction.productRole),
    images: {
      front_url: null,
      ingredients_url: null,
      nutrition_url: null,
    },
    nutrition: {
      energy_kcal_100g: extraction.nutrition.energy_kcal_100g,
      proteins_100g: extraction.nutrition.proteins_100g,
      fat_100g: extraction.nutrition.fat_100g,
      saturated_fat_100g: extraction.nutrition.saturated_fat_100g,
      carbohydrates_100g: extraction.nutrition.carbohydrates_100g,
      sugars_100g: extraction.nutrition.sugars_100g,
      fiber_100g: extraction.nutrition.fiber_100g,
      salt_100g: extraction.nutrition.salt_100g,
      sodium_100g: extraction.nutrition.sodium_100g,
    },
    scores: {
      nutriscore_grade: null,
      nutriscore_score: null,
      ecoscore_grade: null,
      ecoscore_score: null,
    },
  };
};

export const normalizePackagePhotoProduct = (input: {
  barcode: string;
  extraction: PackagePhotoExtractionResult;
}): NormalizedProductV2 => {
  const { barcode, extraction } = input;

  return {
    barcode,
    name: extraction.productName,
    brand: extraction.productBrand,
    imageUrl: null,
    ingredients: extraction.ingredients,
    allergens: [],
    traces: extraction.traces,
    additives: [],
    categories: extraction.productRole ? [extraction.productRole] : [],
    servingSizeText: null,
    servingSizeGrams: null,
    servingSizeMl: null,
    nutrition: {
      caloriesPer100g: extraction.nutrition.energy_kcal_100g,
      caloriesPerServing: null,
      proteinPer100g: extraction.nutrition.proteins_100g,
      carbsPer100g: extraction.nutrition.carbohydrates_100g,
      sugarPer100g: extraction.nutrition.sugars_100g,
      fatPer100g: extraction.nutrition.fat_100g,
      saturatedFatPer100g: extraction.nutrition.saturated_fat_100g,
      fiberPer100g: extraction.nutrition.fiber_100g,
      sodiumPer100g: extraction.nutrition.sodium_100g,
      saltPer100g: extraction.nutrition.salt_100g,
    },
  };
};
