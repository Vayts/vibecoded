import type { BarcodeLookupResponse, PersonalAnalysisJob, ProductPreview } from '@acme/shared';
import type { CompareProductRequestSource } from '../api/scannerMutations';
import type { PhotoOcrData } from '../types/scanner';

type FreshScanAnalysisResult = NonNullable<PersonalAnalysisJob['result']> & {
  scanId?: string;
  productId?: string;
  isFavourite?: boolean;
};

export const buildCompletedAnalysisJob = (
  result: NonNullable<PersonalAnalysisJob['result']>,
): PersonalAnalysisJob => ({
  analysisId: '',
  status: 'completed',
  productStatus: 'completed',
  ingredientsStatus: 'completed',
  result,
});

export const buildCompletedBarcodeLookupResponse = (input: {
  barcode: string;
  source: 'openfoodfacts' | 'photo';
  result: FreshScanAnalysisResult;
}): BarcodeLookupResponse => ({
  success: true,
  barcode: input.barcode,
  source: input.source,
  product: {
    code: input.barcode,
    product_name: input.result.product.name,
    product_name_english: input.result.product.englishName,
    brands: input.result.product.brand,
    image_url: input.result.product.imageUrl,
    ingredients_text: null,
    nutriscore_grade: null,
    categories: null,
    quantity: null,
    serving_size: null,
    ingredients: input.result.product.ingredients,
    allergens: input.result.product.allergens,
    additives: input.result.product.additives,
    additives_count: input.result.product.additives.length,
    traces: input.result.product.traces,
    countries: [],
    category_tags: [],
    nutrition: {
      energy_kcal_100g: input.result.product.nutrition.caloriesPer100g,
      proteins_100g: input.result.product.nutrition.proteinPer100g,
      fat_100g: input.result.product.nutrition.fatPer100g,
      saturated_fat_100g: input.result.product.nutrition.saturatedFatPer100g,
      carbohydrates_100g: input.result.product.nutrition.carbsPer100g,
      sugars_100g: input.result.product.nutrition.sugarPer100g,
      fiber_100g: input.result.product.nutrition.fiberPer100g,
      salt_100g: null,
      sodium_100g: input.result.product.nutrition.sodiumPer100g,
    },
    scores: {
      nutriscore_grade: null,
      nutriscore_score: null,
      ecoscore_grade: null,
      ecoscore_score: null,
    },
  },
  personalAnalysis: buildCompletedAnalysisJob(input.result),
  ...(input.result.scanId ? { scanId: input.result.scanId } : {}),
  ...(input.result.productId ? { productId: input.result.productId } : {}),
  ...(input.result.isFavourite !== undefined ? { isFavourite: input.result.isFavourite } : {}),
});

export const buildBarcodeCompareSource = (barcode: string): CompareProductRequestSource => ({
  type: 'barcode',
  barcode,
});

export const buildPhotoCompareSource = (
  photoUri: string,
  ocr?: PhotoOcrData,
): CompareProductRequestSource => ({
  type: 'photo',
  photoUri,
  ...(ocr ? { ocr } : {}),
});

export const buildBarcodePreviewProduct = (barcode: string): ProductPreview => ({
  productId: '',
  barcode,
  product_name: null,
  product_name_english: null,
  brands: null,
  image_url: null,
});

export const buildPhotoPreviewProduct = (localImageUri: string): ProductPreview => ({
  productId: '',
  barcode: '',
  product_name: null,
  product_name_english: null,
  brands: null,
  image_url: localImageUri,
});

export const getScannerStatusMessage = (input: {
  isPhotoPending: boolean;
  isPreparingPhoto: boolean;
  isResolvingFirstProduct: boolean;
  isBarcodePending: boolean;
  isComparePending: boolean;
}): string => {
  if (input.isPhotoPending) {
    return input.isPreparingPhoto ? 'Capturing photo…' : 'Identifying product…';
  }

  if (input.isResolvingFirstProduct) {
    return 'Identifying products…';
  }

  if (input.isBarcodePending) {
    return 'Analyzing product…';
  }

  if (input.isComparePending) {
    return 'Comparing products…';
  }

  return 'Processing…';
};

