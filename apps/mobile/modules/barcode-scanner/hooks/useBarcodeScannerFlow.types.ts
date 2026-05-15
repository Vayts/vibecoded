import type { CompareProductsResponse, ProductLookupResponse } from '@acme/shared';
import type { MutableRefObject } from 'react';
import type { useCompareProductsMutation } from '../../scanner/hooks/useScannerMutations';
import type { BarcodeScannerFrameBounds } from '../utils/barcodeScannerFrame';
import type { useBarcodeScannerLookupMutation } from './useBarcodeScannerMutations';

export interface BarcodeScannerLastScan {
  barcode: string;
  timestamp: number;
}

export interface BarcodeScannerLookupSheetInput {
  variant: 'found' | 'not-found';
  barcode: string;
  productName?: string | null;
  brandName?: string | null;
  imageUrl?: string | null;
  onAnalyzePress?: () => void;
}

export interface BarcodeScannerErrorSheetInput {
  title?: string;
  message: string;
  actionLabel?: string;
}

export interface UseBarcodeScannerFlowInput {
  analyzeProduct: (input: {
    barcode: string;
    lookupResult: ProductLookupResponse;
  }) => Promise<void>;
  barcodeMutation: ReturnType<typeof useBarcodeScannerLookupMutation>;
  compareMutation: ReturnType<typeof useCompareProductsMutation>;
  isConfirmedBarcode: (barcode: string) => boolean;
  isScannerPaused: boolean;
  lastScanRef: MutableRefObject<BarcodeScannerLastScan | null>;
  openComparisonResult: (result: CompareProductsResponse) => void;
  openErrorSheet: (input: BarcodeScannerErrorSheetInput) => Promise<void>;
  openLookupSheet: (input: BarcodeScannerLookupSheetInput) => Promise<void>;
  resetCompare: () => void;
  resetTransientBarcodeState: () => void;
  rescanCooldownMs: number;
  scanFrameBounds: MutableRefObject<BarcodeScannerFrameBounds | null>;
  scanLockRef: MutableRefObject<boolean>;
  setIsLocked: (value: boolean) => void;
  setIsResolvingFirstProduct: (value: boolean) => void;
  setIsScannerPaused: (value: boolean) => void;
  setPendingBarcodeConfirmation: (barcode: string) => void;
}



