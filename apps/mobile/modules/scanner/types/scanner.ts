import type { BarcodeLookupResponse } from '@acme/shared';

export interface PhotoCaptureInput {
  photoUri: string;
}

export interface PhotoCaptureResponse {
  success: true;
  type: 'photo';
  message: string;
}

export type ScannerMutationResponse = BarcodeLookupResponse | PhotoCaptureResponse;

export interface ScannerResultSheetPayload {
  result: ScannerMutationResponse;
}
