export type BarcodeScannerRouteMode = 'default' | 'compare';

export interface BarcodeScannerLookupSheetPayload {
  variant: 'found' | 'not-found';
  barcode: string;
  productName?: string | null;
  brandName?: string | null;
  imageUrl?: string | null;
  onAnalyzePress?: () => void;
  onDismiss?: () => void;
  onPhotoPress?: () => void;
}

export interface BarcodeScannerErrorSheetPayload {
  title?: string;
  message: string;
  actionLabel?: string;
  onDismiss?: () => void;
}


