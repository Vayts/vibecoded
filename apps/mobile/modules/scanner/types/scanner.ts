import type { BarcodeLookupResponse } from '@acme/shared';

export interface PhotoCaptureInput {
  photoUri: string;
  fileName?: string;
  mimeType?: string;
}

export type ScannerMutationResponse = BarcodeLookupResponse;

export type ScannerResultPresentationMode = 'default' | 'personalOnly';

export type ScannerResultOrigin = 'barcode' | 'photo';

export interface ScannerResultSheetPayload {
  result?: ScannerMutationResponse;
  previewImageUri?: string | null;
  presentationMode?: ScannerResultPresentationMode;
  origin?: ScannerResultOrigin;
}
