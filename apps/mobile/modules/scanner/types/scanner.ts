import type { BarcodeLookupResponse, ProductPreview, ProductComparisonResult } from '@acme/shared';

export type ScannerMutationResponse = BarcodeLookupResponse;

export type ScannerResultPresentationMode = 'default' | 'personalOnly';

export type ScannerResultOrigin = 'barcode';

export interface ScannerResultSheetPayload {
  result?: ScannerMutationResponse;
  scanId?: string;
  previewImageUri?: string | null;
  presentationMode?: ScannerResultPresentationMode;
  origin?: ScannerResultOrigin;
}

export interface ProductDecisionSheetPayload {
  product: ProductPreview;
  onDismiss?: () => void;
}

export interface ComparisonResultSheetPayload {
  result: ProductComparisonResult;
}
