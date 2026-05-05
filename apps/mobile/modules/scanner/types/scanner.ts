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
  photoUri?: string;
  productId?: string | null;
  productName?: string | null;
}

export interface ScannerResultSheetPayload {
  result?: ScannerMutationResponse;
  scanId?: string;
  item?: ScanHistoryItem;
  previewProduct?: ProductPreview;
  photoUri?: string;
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

export interface ProfileScoreSelectorSheetProfile {
  id: string;
  name: string;
  score?: number;
  imageUrl?: string | null;
  fallbackImageUrl?: string | null;
}

export interface ProfileScoreSelectorSheetPayload {
  profiles: ProfileScoreSelectorSheetProfile[];
  selectedProfileId: string;
  onSelect: (profileId: string) => void;
}
