import {
  barcodeLookupRequestSchema,
  barcodeLookupResponseSchema,
  type BarcodeLookupRequest,
  type BarcodeLookupResponse,
} from '@acme/shared';
import { apiFetch } from '../../../shared/lib/client/client';
import type { PhotoCaptureInput, PhotoCaptureResponse } from '../types/scanner';

const MOCK_LATENCY_MS = 900;

const sleep = async (durationMs: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

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

export const submitMockPhotoCapture = async (
  payload: PhotoCaptureInput,
): Promise<PhotoCaptureResponse> => {
  await sleep(MOCK_LATENCY_MS);
  void payload.photoUri;

  return {
    success: true,
    type: 'photo',
    message: 'Product photo was sent to AI',
  };
};
