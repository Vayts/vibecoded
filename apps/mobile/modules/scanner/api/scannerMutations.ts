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

const getErrorMessage = async (response: Response): Promise<string> => {
  const json = (await response.json().catch(() => null)) as { error?: string } | null;
  return json?.error ?? 'Unable to fetch barcode data';
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
    throw new Error(await getErrorMessage(response));
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
    throw new Error(await getErrorMessage(response));
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
    throw new Error(await getErrorMessage(response));
  }

  const json = await response.json();
  return compareProductsResponseSchema.parse(json);
};

export interface PhotoScanRequest {
  imageBase64: string;
}

export interface PhotoOcrResponse {
  productName: string | null;
  brand: string | null;
  isFoodProduct: boolean;
}

export const submitPhotoOcr = async (
  payload: PhotoScanRequest,
): Promise<PhotoOcrResponse> => {
  const response = await apiFetch('/api/scanner/photo/ocr', {
    method: 'POST',
    body: JSON.stringify({ imageBase64: payload.imageBase64 }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as PhotoOcrResponse;
};

export const submitPhotoScan = async (
  payload: PhotoScanRequest,
): Promise<BarcodeLookupSuccessResponse> => {
  const response = await apiFetch('/api/scanner/photo', {
    method: 'POST',
    body: JSON.stringify({ imageBase64: payload.imageBase64 }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const json = await response.json();
  return barcodeLookupSuccessResponseSchema.parse(json);
};
