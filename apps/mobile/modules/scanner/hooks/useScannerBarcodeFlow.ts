import type {
  BarcodeLookupResponse,
  CompareProductsResponse,
  PersonalAnalysisJob,
} from '@acme/shared';
import { useQueryClient } from '@tanstack/react-query';
import type { BarcodeScanningResult } from 'expo-camera';
import { useCallback, type MutableRefObject } from 'react';
import { Platform } from 'react-native';
import { ScannerApiError } from '../api/scannerMutations';
import { useCompareStore } from '../stores/compareStore';
import { validateScannedBarcode } from '../utils/barcodeValidation';
import { isBarcodeWithinFrame, type ScannerFrameBounds } from '../utils/scannerBarcodeFrame';
import {
  buildBarcodeCompareSource,
  buildBarcodePreviewProduct,
  buildCompletedAnalysisJob,
  buildCompletedBarcodeLookupResponse,
  buildPhotoCompareSource,
} from '../utils/scannerResultBuilders';
import type { useCompareProductsMutation, useScanBarcodeMutation } from './useScannerMutations';
import type { BeginResultSheetSession } from './useScannerSheets';
import { SCAN_HISTORY_QUERY_KEY } from '../../scans/hooks/useScanHistoryQuery';

interface LastScan {
  barcode: string;
  timestamp: number;
}

interface UseScannerBarcodeFlowInput {
  barcodeMutation: ReturnType<typeof useScanBarcodeMutation>;
  beginResultSheetSession: BeginResultSheetSession;
  compareMutation: ReturnType<typeof useCompareProductsMutation>;
  handleResultSheetError: (error: unknown, fallbackMessage: string) => Promise<void>;
  hydrateResultSession: (
    sessionId: number,
    payload: {
      result?: BarcodeLookupResponse;
      resolvedPersonalResult?: PersonalAnalysisJob;
    },
  ) => void;
  isScannerErrorSheetOpen: boolean;
  isScannerPaused: boolean;
  isConfirmedBarcode: (barcode: string) => boolean;
  lastScanRef: MutableRefObject<LastScan | null>;
  openComparisonResult: (result: CompareProductsResponse) => void;
  openScannerErrorSheet: (error: unknown, fallbackMessage: string) => Promise<void>;
  resetCompare: () => void;
  resetTransientBarcodeState: () => void;
  rescanCooldownMs: number;
  scanFrameBounds: MutableRefObject<ScannerFrameBounds | null>;
  scanLockRef: MutableRefObject<boolean>;
  setIsLocked: (value: boolean) => void;
  setIsScannerPaused: (value: boolean) => void;
  setPendingBarcodeConfirmation: (barcode: string) => void;
}

export const useScannerBarcodeFlow = ({
  barcodeMutation,
  beginResultSheetSession,
  compareMutation,
  handleResultSheetError,
  hydrateResultSession,
  isConfirmedBarcode,
  isScannerErrorSheetOpen,
  isScannerPaused,
  lastScanRef,
  openComparisonResult,
  openScannerErrorSheet,
  resetCompare,
  resetTransientBarcodeState,
  rescanCooldownMs,
  scanFrameBounds,
  scanLockRef,
  setIsLocked,
  setIsScannerPaused,
  setPendingBarcodeConfirmation,
}: UseScannerBarcodeFlowInput) => {
  const queryClient = useQueryClient();
  const submitBarcode = useCallback(
    async (barcode: string) => {
      const normalized = barcode.trim();

      console.log(normalized);

      if (!normalized || scanLockRef.current || isScannerPaused || isScannerErrorSheetOpen) {
        return;
      }

      const validationResult = validateScannedBarcode({ barcode: normalized, type: 'code128' });
      if (!validationResult.isValid) {
        return;
      }

      resetTransientBarcodeState();

      const now = Date.now();
      const prev = lastScanRef.current;
      if (prev && prev.barcode === normalized && now - prev.timestamp < rescanCooldownMs) {
        return;
      }

      scanLockRef.current = true;
      lastScanRef.current = { barcode: normalized, timestamp: now };
      setIsLocked(true);
      setIsScannerPaused(true);

      try {
        const compareState = useCompareStore.getState();
        const first = compareState.firstProduct;

        if (compareState.isCompareMode && first) {
          if (!compareState.firstProductPhotoUri && first.barcode.trim() === normalized) {
            await openScannerErrorSheet(
              new ScannerApiError(
                'We identified the same product in both scans. Scan a different product to compare.',
                'SAME_PRODUCT',
              ),
              'Unable to compare products',
            );
            return;
          }

          const result = await compareMutation.mutateAsync({
            productA: compareState.firstProductPhotoUri
              ? buildPhotoCompareSource(
                  compareState.firstProductPhotoUri,
                  compareState.firstProductOcr ?? undefined,
                )
              : buildBarcodeCompareSource(first.barcode),
            productB: buildBarcodeCompareSource(normalized),
          });
          openComparisonResult(result);
          return;
        }

        const sessionId = beginResultSheetSession(buildBarcodePreviewProduct(normalized));

        try {
          const result = await barcodeMutation.mutateAsync({ barcode: normalized });
          hydrateResultSession(sessionId, {
            result: buildCompletedBarcodeLookupResponse({
              barcode: normalized,
              source: 'openfoodfacts',
              result,
            }),
            resolvedPersonalResult: buildCompletedAnalysisJob(result),
          });
          void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
        } catch (error) {
          await handleResultSheetError(error, 'Unable to submit barcode');
        }
      } catch (error) {
        if (!useCompareStore.getState().isCompareMode) {
          resetCompare();
        }

        await openScannerErrorSheet(error, 'Unable to submit barcode');
      }
    },
    [
      barcodeMutation,
      beginResultSheetSession,
      compareMutation,
      handleResultSheetError,
      hydrateResultSession,
      isScannerErrorSheetOpen,
      isScannerPaused,
      lastScanRef,
      openComparisonResult,
      openScannerErrorSheet,
      queryClient,
      resetCompare,
      resetTransientBarcodeState,
      rescanCooldownMs,
      scanLockRef,
      setIsLocked,
      setIsScannerPaused,
    ],
  );

  const handleBarcodeScanned = useCallback(
    async ({ data, bounds, type }: BarcodeScanningResult) => {
      if (scanLockRef.current || isScannerPaused || isScannerErrorSheetOpen) {
        return;
      }

      const validationResult = validateScannedBarcode({ barcode: data, type });
      if (!validationResult.isValid) {
        return;
      }

      if (Platform.OS !== 'ios' && bounds && scanFrameBounds.current) {
        if (!isBarcodeWithinFrame(bounds, scanFrameBounds.current)) {
          return;
        }
      }

      const normalizedBarcode = validationResult.normalizedBarcode;
      if (isConfirmedBarcode(normalizedBarcode)) {
        await submitBarcode(normalizedBarcode);
        return;
      }

      setPendingBarcodeConfirmation(normalizedBarcode);
    },
    [
      isConfirmedBarcode,
      isScannerErrorSheetOpen,
      isScannerPaused,
      scanFrameBounds,
      scanLockRef,
      setPendingBarcodeConfirmation,
      submitBarcode,
    ],
  );

  return { handleBarcodeScanned, submitBarcode };
};
