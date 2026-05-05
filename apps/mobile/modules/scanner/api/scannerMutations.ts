import {
  barcodeLookupRequestSchema,
  scannerProductAnalysisResultSchema,
  compareProductsRequestSchema,
  compareProductsResponseSchema,
  type BarcodeLookupRequest,
  type ScannerProductAnalysisResult,
  type CompareProductsRequest,
  type CompareProductsResponse,
} from '@acme/shared';
import { z } from 'zod';
import { apiFetch } from '../../../shared/lib/client/client';
import type { PhotoOcrData } from '../types/scanner';

interface ApiErrorPayload {
  error?: string;
  code?: string;
}

export class ScannerApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ScannerApiError';
  }
}

const getErrorPayload = async (response: Response): Promise<ApiErrorPayload | null> => {
  return (await response.json().catch(() => null)) as ApiErrorPayload | null;
};

const throwScannerApiError = async (
  response: Response,
  fallbackMessage: string,
): Promise<never> => {
  const payload = await getErrorPayload(response);
  throw new ScannerApiError(payload?.error ?? fallbackMessage, payload?.code, response.status);
};

export const submitBarcodeScan = async (
  payload: BarcodeLookupRequest,
): Promise<ScannerProductAnalysisResult> => {
  const parsedPayload = barcodeLookupRequestSchema.parse(payload);

  const response = await apiFetch('/product-analyze-v2/barcode', {
    method: 'POST',
    body: JSON.stringify(parsedPayload),
  });

  if (!response.ok) {
    await throwScannerApiError(response, 'Unable to fetch barcode data');
  }

  const json = await response.json();
  return scannerProductAnalysisResultSchema.parse(json);
};

export const compareProducts = async (
  payload: CompareProductsRequest,
): Promise<CompareProductsResponse> => {
  const parsedPayload = compareProductsRequestSchema.parse(payload);
  const response = await apiFetch('/api/scanner/compare', {
    method: 'POST',
    body: JSON.stringify(parsedPayload),
  });

  if (!response.ok) {
    await throwScannerApiError(response, 'Unable to compare products');
  }

  const json = await response.json();
  return compareProductsResponseSchema.parse(json);
};

export interface PhotoScanRequest {
  photoUri: string;
  ocr?: PhotoOcrData;
}

interface ReactNativeFile {
  uri: string;
  name: string;
  type: string;
}

const photoScanResponseSchema = scannerProductAnalysisResultSchema.extend({
  barcode: z.string(),
  productId: z.string().optional(),
});

export type PhotoScanResponse = z.infer<typeof photoScanResponseSchema>;

const buildPhotoFormData = (payload: PhotoScanRequest): FormData => {
  const formData = new FormData();
  const photoFile: ReactNativeFile = {
    uri: payload.photoUri,
    name: 'scanner-photo.jpg',
    type: 'image/jpeg',
  };

  formData.append('photo', photoFile as unknown as Blob);

  if (payload.ocr) {
    formData.append('ocr', JSON.stringify(payload.ocr));
  }

  return formData;
};

export const submitPhotoScan = async (payload: PhotoScanRequest): Promise<PhotoScanResponse> => {
  const response = await apiFetch('/product-analyze-v2/photo', {
    method: 'POST',
    body: buildPhotoFormData(payload),
  });

  if (!response.ok) {
    await throwScannerApiError(response, 'Unable to identify product from photo');
  }

  const json = await response.json();
  return photoScanResponseSchema.parse(json);
};
