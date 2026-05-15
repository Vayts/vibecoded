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

Return only facts that are directly visible in the images. Do not use outside knowledge. Do not infer missing nutrition values. Do not convert per-serving values into per-100g values.

Return one JSON object with exactly these fields:
- productName: exact visible product name.
- productBrand: exact visible brand.
- productRole: choose exactly one product role from this list when the product type is clear: ${PRODUCT_ROLE_LIST}. Return null, or omit it for providers that do not support null in structured output, when the product role is not clear from the photos.
- ingredients: array of visible ingredients. Split into individual items only when clearly readable.
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
- Nutrition values must be taken only from rows explicitly shown per 100 g.
- Ignore values shown only per serving, per portion, or per 100 ml.
- If a value is not visible, return null, or omit it for providers that do not support null in structured output.

Return valid JSON only.`;

export const PACKAGE_PHOTO_EXTRACTION_USER_PROMPT =
  'Extract productName, productBrand, productRole, ingredients, and nutrition per 100 grams only from these package photos.';

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

const toNullableTrimmedText = (value: string | null): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
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

const toTrimmedUniqueList = (values: string[]): string[] => {
  return values
    .map((value) => value.trim())
    .filter((value, index, list) => value.length > 0 && list.indexOf(value) === index);
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

export const normalizePackagePhotoExtractionResult = (
  result: PackagePhotoExtractionResult,
): PackagePhotoExtractionResult => ({
  productName: toNullableTrimmedText(result.productName),
  productBrand: toNullableTrimmedText(result.productBrand),
  productRole: normalizeProductRole(result.productRole),
  ingredients: toTrimmedUniqueList(result.ingredients),
  nutrition: normalizeNutrition(result.nutrition),
});

export const normalizeGeminiPackagePhotoExtractionResult = (
  result: GeminiPackagePhotoExtractionResult,
): PackagePhotoExtractionResult => ({
  productName: toNullableTrimmedOptionalText(result.productName),
  productBrand: toNullableTrimmedOptionalText(result.productBrand),
  productRole: normalizeProductRole(result.productRole),
  ingredients: toTrimmedUniqueList(result.ingredients),
  nutrition: normalizeNutrition(result.nutrition),
});
