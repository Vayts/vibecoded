import type {
  AnalysisJobResponse,
  BarcodeLookupResponse,
  ProductComparisonResult,
  ProductPreview,
} from '@acme/shared';

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
  previewProduct?: ProductPreview;
  previewImageUri?: string | null;
  resolvedPersonalResult?: AnalysisJobResponse;
  presentationMode?: ScannerResultPresentationMode;
  origin?: ScannerResultOrigin;
}

export interface ProductDecisionSheetPayload {
  product: ProductPreview;
  photoUri?: string;
  photoOcr?: PhotoOcrData;
  onDismiss?: () => void;
}

export interface ComparisonResultSheetPayload {
  result?: ProductComparisonResult;
  scanId?: string;
  comparisonId?: string;
}
