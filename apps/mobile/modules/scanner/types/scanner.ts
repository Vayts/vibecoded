import type {
  BarcodeLookupResponse,
  PersonalAnalysisJob,
  ProductPreview,
  ScanHistoryItem,
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

export type ScannerRouteMode = 'default' | 'compare';

export interface CompareProductSource {
  barcode: string;
  productId?: string | null;
  productName?: string | null;
}

export interface ScannerResultSheetPayload {
  result?: ScannerMutationResponse;
  scanId?: string;
  item?: ScanHistoryItem;
  previewProduct?: ProductPreview;
  resolvedPersonalResult?: PersonalAnalysisJob;
  presentationMode?: ScannerResultPresentationMode;
  origin?: ScannerResultOrigin;
  onBeforeErrorSheetOpen?: () => void;
  onErrorSheetDismiss?: () => void;
}

export interface ProductDecisionSheetPayload {
  product: ProductPreview;
  photoUri?: string;
  photoOcr?: PhotoOcrData;
  onDismiss?: () => void;
}

export interface CompareProductPickerSheetPayload {
  currentProduct: CompareProductSource;
}
