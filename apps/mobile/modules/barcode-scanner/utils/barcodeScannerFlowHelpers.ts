import { ScannerApiError } from '../../scanner/api/scannerMutations';
import type { BarcodeScannerLookupResponse } from '../api/barcodeScannerMutations';

export interface BarcodeScannerSheetProductPreview {
  productName?: string | null;
  brandName?: string | null;
  imageUrl?: string | null;
}

export interface BarcodeScannerErrorDetails {
  code?: string;
  message: string;
}

export const getBarcodeScannerErrorDetails = (
  error: unknown,
  fallbackMessage: string,
): BarcodeScannerErrorDetails => {
  if (error instanceof ScannerApiError) {
    return { code: error.code, message: error.message };
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    const code = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
    return { code, message: error.message };
  }

  return { message: fallbackMessage };
};

export const buildFoundSheetProductPreview = (
  result: BarcodeScannerLookupResponse,
): BarcodeScannerSheetProductPreview => ({
  productName: result.product.product_name,
  brandName: result.product.brands,
  imageUrl: result.product.image_url,
});


