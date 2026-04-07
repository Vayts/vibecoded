import type { BarcodeLookupResponse, ProductPreview, ProductComparisonResult } from '@acme/shared';

export type ScannerMutationResponse = BarcodeLookupResponse;

export interface PhotoOcrData {
  allText: string;
  productName: string | null;
  brand: string | null;
  isFoodProduct: boolean;
}

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
  imageBase64?: string;
  photoOcr?: PhotoOcrData;
  onDismiss?: () => void;
  onAnalyzeStart?: () => void;
}

export interface ComparisonResultSheetPayload {
  result?: ProductComparisonResult;
  scanId?: string;
  comparisonId?: string;
}
