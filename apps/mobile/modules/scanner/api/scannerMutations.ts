import {
  barcodeLookupRequestSchema,
  barcodeLookupResponseSchema,
  productLookupRequestSchema,
  productLookupResponseSchema,
  compareProductsRequestSchema,
  compareProductsResponseSchema,
  barcodeLookupSuccessResponseSchema,
  type BarcodeLookupRequest,
  type BarcodeLookupResponse,
  type BarcodeLookupSuccessResponse,
  type ProductLookupRequest,
  type ProductLookupResponse,
  type CompareProductsRequest,
  type CompareProductsResponse,
} from '@acme/shared';
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
  throw new ScannerApiError(
    payload?.error ?? fallbackMessage,
    payload?.code,
    response.status,
  );
};

export const submitBarcodeScan = async (
  payload: BarcodeLookupRequest,
): Promise<BarcodeLookupResponse> => {
  const parsedPayload = barcodeLookupRequestSchema.parse(payload);
  const response = await apiFetch('/api/scanner/barcode', {
    method: 'POST',
    body: JSON.stringify(parsedPayload),
  });

  if (!response.ok) {
    await throwScannerApiError(response, 'Unable to fetch barcode data');
  }

  const json = await response.json();
  return barcodeLookupResponseSchema.parse(json);
};

export const lookupProduct = async (
  payload: ProductLookupRequest,
): Promise<ProductLookupResponse> => {
  const parsedPayload = productLookupRequestSchema.parse(payload);
  const response = await apiFetch('/api/scanner/lookup', {
    method: 'POST',
    body: JSON.stringify(parsedPayload),
  });

  if (!response.ok) {
    await throwScannerApiError(response, 'Unable to look up product');
  }

  const json = await response.json();
  return productLookupResponseSchema.parse(json);
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

export type PhotoOcrResponse = PhotoOcrData;

interface ReactNativeFile {
  uri: string;
  name: string;
  type: string;
}

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

export const submitPhotoOcr = async (
  payload: PhotoScanRequest,
): Promise<PhotoOcrResponse> => {
  const response = await apiFetch('/api/scanner/photo/ocr', {
    method: 'POST',
    body: buildPhotoFormData(payload),
  });

  if (!response.ok) {
    await throwScannerApiError(response, 'Unable to read product from photo');
  }

  return (await response.json()) as PhotoOcrResponse;
};

export const submitPhotoScan = async (
  payload: PhotoScanRequest,
): Promise<BarcodeLookupSuccessResponse> => {
  const response = await apiFetch('/api/scanner/photo', {
    method: 'POST',
    body: buildPhotoFormData(payload),
  });

  if (!response.ok) {
    await throwScannerApiError(response, 'Unable to identify product from photo');
  }

  const json = await response.json();
  return barcodeLookupSuccessResponseSchema.parse(json);
};
