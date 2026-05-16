import { ApiError } from '../../../shared/errors/api-error.js';
import {
  IMAGE_TOO_LARGE_ERROR,
  INVALID_PHOTO_FILE_ERROR,
  MAX_PHOTO_UPLOAD_SIZE,
  PHOTO_FILE_REQUIRED_ERROR,
} from '../constants/photo-analysis.constants.js';
import type {
  GeminiPackagePhotoExtractionResult,
  PackagePhotoExtractionResult,
  UploadedPhotoFileV2,
} from '../types/analyze-photo-v2.types.js';
import { VALID_PRODUCT_ROLES } from '../types/product-role.types.js';

export interface PackagePhotoInput {
  imageBase64: string;
  index: number;
  mimetype: string;
}

const PRODUCT_ROLE_LIST = VALID_PRODUCT_ROLES.join(', ');

export const PACKAGE_PHOTO_EXTRACTION_PROMPT = `You extract structured food product data from package photos.

Use all provided images together. The photos may show the front label, nutrition facts, ingredients, or an extra side of the same package.

Return only facts that are directly visible in the images. Do not use outside knowledge. Do not infer missing nutrition values. You may calculate per-100g nutrition only when both the nutrient value and the serving size weight in grams are directly visible on the package.

Return one JSON object with exactly these fields:
- productName: exact visible product name.
- productNameEnglish: natural concise English translation of productName. If productName is already English, return the same name. Return null or omit only when productName is missing.
- productBrand: exact visible brand.
- productRole: choose exactly one product role from this list when the product type is clear: ${PRODUCT_ROLE_LIST}. Return null, or omit it for providers that do not support null in structured output, when the product role is not clear from the photos.
- ingredients: array of visible ingredients. Split into individual items only when clearly readable.
- ingredientsEnglish: English translations for ingredients, in exactly the same order as ingredients. If an ingredient is already English, return the same ingredient in English.
- nutrition: object with only these keys:
  - fat_100g
  - salt_100g
  - fiber_100g
  - sodium_100g
  - sugars_100g
  - proteins_100g
  - energy_kcal_100g
  - carbohydrates_100g
  - saturated_fat_100g

Rules:
- Return ingredients as an empty array when they are not visible or cannot be separated reliably.
- ingredientsEnglish must have the same length and order as ingredients.
- Nutrition values must always be returned as per 100 g.
- If the package explicitly shows a per-100 g column, use those values directly.
- If the package only shows per-serving or per-portion values, convert them to per 100 g only when the serving size weight in grams is visible. Formula: value_per_100g = value_per_serving / serving_size_grams * 100.
- Convert milligrams to grams for gram-based fields. Example: sodium 300 mg per 30 g serving => sodium_100g = 1.
- If salt is not shown but sodium is visible or calculated, calculate salt_100g = sodium_100g * 2.5.
- Do not use percent daily values for nutrition extraction.
- Ignore values shown only per 100 ml.
- If a specific nutrition value is not visible and cannot be calculated from visible values, return null, or omit it for providers that do not support null in structured output.
- If a readable nutrition facts panel is visible, do not omit the nutrition object.

Return valid JSON only.`;

export const PACKAGE_PHOTO_EXTRACTION_USER_PROMPT =
  'Extract productName, productNameEnglish, productBrand, productRole, ingredients, ingredientsEnglish, and nutrition per 100 grams only from these package photos.';

export const toPackagePhotoInputs = (files: UploadedPhotoFileV2[]): PackagePhotoInput[] => {
  if (files.length === 0) {
    throw ApiError.badRequest(PHOTO_FILE_REQUIRED_ERROR);
  }

  return files.map((file, index) => {
    if (!file.buffer || file.buffer.length === 0) {
      throw ApiError.badRequest(PHOTO_FILE_REQUIRED_ERROR);
    }

    if (file.size > MAX_PHOTO_UPLOAD_SIZE) {
      throw ApiError.badRequest(IMAGE_TOO_LARGE_ERROR);
    }

    if (!file.mimetype.startsWith('image/')) {
      throw ApiError.badRequest(INVALID_PHOTO_FILE_ERROR);
    }

    return {
      imageBase64: file.buffer.toString('base64'),
      index,
      mimetype: file.mimetype,
    };
  });
};

const toNullableTrimmedOptionalText = (value?: string): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const normalizeProductRole = (
  value:
    | PackagePhotoExtractionResult['productRole']
    | GeminiPackagePhotoExtractionResult['productRole'],
): PackagePhotoExtractionResult['productRole'] => {
  return value ?? null;
};

const normalizeIngredients = (
  ingredients: string[],
  translations: (string | null | undefined)[],
) => {
  const seen = new Set<string>();
  const normalizedIngredients: string[] = [];
  const normalizedTranslations: (string | null)[] = [];

  ingredients.forEach((ingredient, index) => {
    const normalizedIngredient = ingredient.trim();

    if (!normalizedIngredient || seen.has(normalizedIngredient)) {
      return;
    }

    const normalizedTranslation = translations[index]?.trim();
    seen.add(normalizedIngredient);
    normalizedIngredients.push(normalizedIngredient);
    normalizedTranslations.push(normalizedTranslation ? normalizedTranslation : null);
  });

  return { ingredients: normalizedIngredients, ingredientsEnglish: normalizedTranslations };
};

const normalizeNutritionValue = (value: number | null | undefined): number | null => {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const normalizeNutrition = (
  nutrition: Partial<PackagePhotoExtractionResult['nutrition']> | undefined,
): PackagePhotoExtractionResult['nutrition'] => ({
  fat_100g: normalizeNutritionValue(nutrition?.fat_100g),
  salt_100g: normalizeNutritionValue(nutrition?.salt_100g),
  fiber_100g: normalizeNutritionValue(nutrition?.fiber_100g),
  sodium_100g: normalizeNutritionValue(nutrition?.sodium_100g),
  sugars_100g: normalizeNutritionValue(nutrition?.sugars_100g),
  proteins_100g: normalizeNutritionValue(nutrition?.proteins_100g),
  energy_kcal_100g: normalizeNutritionValue(nutrition?.energy_kcal_100g),
  carbohydrates_100g: normalizeNutritionValue(nutrition?.carbohydrates_100g),
  saturated_fat_100g: normalizeNutritionValue(nutrition?.saturated_fat_100g),
});

export const normalizeGeminiPackagePhotoExtractionResult = (
  result: GeminiPackagePhotoExtractionResult,
): PackagePhotoExtractionResult => {
  const ingredients = normalizeIngredients(result.ingredients, result.ingredientsEnglish);

  return {
    productName: toNullableTrimmedOptionalText(result.productName),
    productNameEnglish: toNullableTrimmedOptionalText(result.productNameEnglish),
    productBrand: toNullableTrimmedOptionalText(result.productBrand),
    productRole: normalizeProductRole(result.productRole),
    ...ingredients,
    nutrition: normalizeNutrition(result.nutrition),
  };
};
