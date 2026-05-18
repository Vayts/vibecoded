import type {
  PackagePhotoCoverageCode,
  PackagePhotoExtractionResult,
  PackagePhotoMissingField,
  UploadedPhotoFileV2,
} from '../types/analyze-photo-v2.types.js';
import { extractPackageProductDataWithGemini } from './package-photo-extraction-gemini.service.js';
import {
  createPackagePhotoTraceContext,
  type PackagePhotoTraceContext,
} from './package-photo-tracing.util.js';

const NUTRITION_KEYS: Array<keyof PackagePhotoExtractionResult['nutrition']> = [
  'fat_100g',
  'salt_100g',
  'fiber_100g',
  'sodium_100g',
  'sugars_100g',
  'proteins_100g',
  'energy_kcal_100g',
  'carbohydrates_100g',
  'saturated_fat_100g',
];

interface ParallelExtractionInput {
  files: UploadedPhotoFileV2[];
  metadata: unknown;
  userId: string;
}

const firstText = (
  results: PackagePhotoExtractionResult[],
  key: 'productName' | 'productBrand',
) => {
  return results.map((result) => result[key]?.trim()).find(Boolean) ?? null;
};

const firstProductRole = (results: PackagePhotoExtractionResult[]) => {
  return results.map((result) => result.productRole).find((role) => role !== null) ?? null;
};

const dedupeText = (items: string[]): string[] => {
  const seen = new Set<string>();
  const deduped: string[] = [];

  items.forEach((item) => {
    const normalized = item.trim();
    const key = normalized.toLowerCase();

    if (!normalized || seen.has(key)) {
      return;
    }

    seen.add(key);
    deduped.push(normalized);
  });

  return deduped;
};

const mergeNutrition = (
  results: PackagePhotoExtractionResult[],
): PackagePhotoExtractionResult['nutrition'] => {
  return NUTRITION_KEYS.reduce<PackagePhotoExtractionResult['nutrition']>(
    (nutrition, key) => {
      nutrition[key] =
        results.map((result) => result.nutrition[key]).find((value) => value !== null) ?? null;
      return nutrition;
    },
    {
      fat_100g: null,
      salt_100g: null,
      fiber_100g: null,
      sodium_100g: null,
      sugars_100g: null,
      proteins_100g: null,
      energy_kcal_100g: null,
      carbohydrates_100g: null,
      saturated_fat_100g: null,
    },
  );
};

export const mergePackagePhotoExtractions = (
  results: PackagePhotoExtractionResult[],
): PackagePhotoExtractionResult => ({
  productName: firstText(results, 'productName'),
  productBrand: firstText(results, 'productBrand'),
  productRole: firstProductRole(results),
  ingredients: dedupeText(results.flatMap((result) => result.ingredients)),
  traces: dedupeText(results.flatMap((result) => result.traces)),
  nutrition: mergeNutrition(results),
});

const createSinglePhotoTraceContext = (
  input: ParallelExtractionInput,
  file: UploadedPhotoFileV2,
  index: number,
): PackagePhotoTraceContext => {
  return createPackagePhotoTraceContext({
    endpoint: 'package-photos',
    files: [file],
    metadata: { originalPhotoIndex: index, requestMetadata: input.metadata },
    provider: 'gemini',
    userId: input.userId,
  });
};

export const extractAndMergePackagePhotos = async (
  input: ParallelExtractionInput,
): Promise<PackagePhotoExtractionResult> => {
  const extractions = await Promise.all(
    input.files.map((file, index) =>
      extractPackageProductDataWithGemini(
        [file],
        createSinglePhotoTraceContext(input, file, index),
      ),
    ),
  );

  return mergePackagePhotoExtractions(extractions);
};

const hasPackagePhotoIngredients = (extraction: PackagePhotoExtractionResult): boolean => {
  return extraction.ingredients.length > 0;
};

const hasPackagePhotoNutritionFacts = (extraction: PackagePhotoExtractionResult): boolean => {
  return NUTRITION_KEYS.some((key) => extraction.nutrition[key] !== null);
};

export const getPackagePhotoCoverageCode = (
  extraction: PackagePhotoExtractionResult,
): PackagePhotoCoverageCode => {
  const hasIngredients = hasPackagePhotoIngredients(extraction);
  const hasNutritionFacts = hasPackagePhotoNutritionFacts(extraction);

  if (hasIngredients && hasNutritionFacts) {
    return 1;
  }

  if (hasIngredients) {
    return 2;
  }

  if (hasNutritionFacts) {
    return 3;
  }

  return 0;
};

export const getMissingPackagePhotoFields = (
  extraction: PackagePhotoExtractionResult,
): PackagePhotoMissingField[] => {
  const missingFields: PackagePhotoMissingField[] = [];
  const hasIngredients = hasPackagePhotoIngredients(extraction);
  const hasNutritionFacts = hasPackagePhotoNutritionFacts(extraction);

  if (!hasIngredients) {
    missingFields.push('ingredients');
  }

  if (!hasNutritionFacts) {
    missingFields.push('nutritionFacts');
  }

  return missingFields;
};

export const buildMissingPackagePhotoMessage = (
  missingFields: PackagePhotoMissingField[],
): string => {
  const needsIngredients = missingFields.includes('ingredients');
  const needsNutrition = missingFields.includes('nutritionFacts');

  if (needsIngredients && needsNutrition) {
    return 'Add a clear photo showing the ingredients list and nutrition facts.';
  }

  return needsNutrition
    ? 'Add a clear photo of the nutrition facts panel.'
    : 'Add a clear photo of the ingredients list.';
};
