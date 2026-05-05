import {
  barcodeLookupRequestSchema,
  scannerProductAnalysisResultSchema,
  compareProductsResponseSchema,
  type BarcodeLookupRequest,
  type ScannerProductAnalysisResult,
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

export type CompareProductRequestSource =
  | {
      type: 'barcode';
      barcode: string;
    }
  | {
      type: 'photo';
      photoUri: string;
      ocr?: PhotoOcrData;
    };

export type CompareProductsRequest =
  | {
      barcode1: string;
      barcode2: string;
    }
  | {
      productA: CompareProductRequestSource;
      productB: CompareProductRequestSource;
    };

const isSourceCompareRequest = (
  payload: CompareProductsRequest,
): payload is { productA: CompareProductRequestSource; productB: CompareProductRequestSource } => {
  return 'productA' in payload && 'productB' in payload;
};

const isPhotoCompareSource = (
  source: CompareProductRequestSource,
): source is Extract<CompareProductRequestSource, { type: 'photo' }> => source.type === 'photo';

const toCompareProductBody = (source: CompareProductRequestSource) => {
  if (source.type === 'barcode') {
    return { type: 'barcode', barcode: source.barcode.trim() };
  }

  return {
    type: 'photo',
    ...(source.ocr ? { ocr: source.ocr } : {}),
  };
};

const appendComparePhoto = (
  formData: FormData,
  fieldName: 'photoA' | 'photoB',
  source: CompareProductRequestSource,
) => {
  if (!isPhotoCompareSource(source)) {
    return;
  }

  const photoFile: ReactNativeFile = {
    uri: source.photoUri,
    name: `${fieldName}.jpg`,
    type: 'image/jpeg',
  };

  formData.append(fieldName, photoFile as unknown as Blob);
};

const buildCompareFormData = (payload: {
  productA: CompareProductRequestSource;
  productB: CompareProductRequestSource;
}): FormData => {
  const formData = new FormData();

  formData.append('productA', JSON.stringify(toCompareProductBody(payload.productA)));
  formData.append('productB', JSON.stringify(toCompareProductBody(payload.productB)));
  appendComparePhoto(formData, 'photoA', payload.productA);
  appendComparePhoto(formData, 'photoB', payload.productB);

  return formData;
};

export const compareProducts = async (
  payload: CompareProductsRequest,
): Promise<CompareProductsResponse> => {
  const requestBody = isSourceCompareRequest(payload)
    ? buildCompareFormData(payload)
    : JSON.stringify({
        barcodeA: payload.barcode1.trim(),
        barcodeB: payload.barcode2.trim(),
      });

  const response = await apiFetch('/product-analyze-v2/compare', {
    method: 'POST',
    body: requestBody,
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
