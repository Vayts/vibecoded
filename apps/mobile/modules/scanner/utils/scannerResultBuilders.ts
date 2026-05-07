import type { PersonalAnalysisJob, ProductPreview } from '@acme/shared';
import type { CompareProductRequestSource } from '../api/scannerMutations';
import type { PhotoOcrData } from '../types/scanner';

export const buildCompletedAnalysisJob = (
  result: NonNullable<PersonalAnalysisJob['result']>,
): PersonalAnalysisJob => ({
  analysisId: '',
  status: 'completed',
  productStatus: 'completed',
  ingredientsStatus: 'completed',
  result,
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
  brands: null,
  image_url: null,
});

export const buildPhotoPreviewProduct = (localImageUri: string): ProductPreview => ({
  productId: '',
  barcode: '',
  product_name: null,
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

