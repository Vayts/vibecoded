import type { BarcodeScanningResult } from 'expo-camera';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useCompareStore } from '../../scanner/stores/compareStore';
import {
  buildBarcodeCompareSource,
  buildPhotoCompareSource,
} from '../../scanner/utils/scannerResultBuilders';
import { validateScannedBarcode } from '../utils/barcodeValidation';
import {
  buildFoundSheetProductPreview,
  getBarcodeScannerErrorDetails,
} from '../utils/barcodeScannerFlowHelpers';
import { isBarcodeWithinFrame } from '../utils/barcodeScannerFrame';
import type { UseBarcodeScannerFlowInput } from './useBarcodeScannerFlow.types';

export const useBarcodeScannerFlow = ({
  analyzeProduct,
  barcodeMutation,
  compareMutation,
  isConfirmedBarcode,
  isScannerPaused,
  lastScanRef,
  openComparisonResult,
  openErrorSheet,
  openLookupSheet,
  resetCompare,
  resetTransientBarcodeState,
  rescanCooldownMs,
  scanFrameBounds,
  scanLockRef,
  setIsLocked,
  setIsResolvingFirstProduct,
  setIsScannerPaused,
  setPendingBarcodeConfirmation,
}: UseBarcodeScannerFlowInput) => {
  const submitBarcode = useCallback(
    async (barcode: string) => {
      const normalized = barcode.trim();
      if (!normalized || scanLockRef.current || isScannerPaused) {
        return;
      }

      const validationResult = validateScannedBarcode({ barcode: normalized, type: 'code128' });
      if (!validationResult.isValid) {
        return;
      }

      resetTransientBarcodeState();

      const now = Date.now();
      const previousScan = lastScanRef.current;
      if (
        previousScan &&
        previousScan.barcode === normalized &&
        now - previousScan.timestamp < rescanCooldownMs
      ) {
        return;
      }

      scanLockRef.current = true;
      lastScanRef.current = { barcode: normalized, timestamp: now };
      setIsLocked(true);
      setIsScannerPaused(true);

      try {
        const compareState = useCompareStore.getState();
        const firstProduct = compareState.firstProduct;

        if (compareState.isCompareMode && firstProduct) {
          if (!compareState.firstProductPhotoUri && firstProduct.barcode.trim() === normalized) {
            await openErrorSheet({
              title: 'This is the same product',
              message:
                'We identified the same product in both scans. Scan a different product to compare.',
              actionLabel: 'Scan another product',
            });
            return;
          }

          setIsResolvingFirstProduct(true);
          const comparison = await compareMutation.mutateAsync({
            productA: compareState.firstProductPhotoUri
              ? buildPhotoCompareSource(
                  compareState.firstProductPhotoUri,
                  compareState.firstProductOcr ?? undefined,
                )
              : buildBarcodeCompareSource(firstProduct.barcode),
            productB: buildBarcodeCompareSource(normalized),
          });
          setIsResolvingFirstProduct(false);
          openComparisonResult(comparison);
          return;
        }

        const result = await barcodeMutation.mutateAsync({ barcode: normalized });
        await openLookupSheet({
          variant: 'found',
          barcode: normalized,
          ...buildFoundSheetProductPreview(result),
          onAnalyzePress: () => {
            void analyzeProduct({
              barcode: normalized,
              lookupResult: result,
            });
          },
        });
      } catch (error) {
        setIsResolvingFirstProduct(false);

        if (!useCompareStore.getState().isCompareMode) {
          resetCompare();
        }

        const { code, message } = getBarcodeScannerErrorDetails(error, 'Unable to submit barcode');

        if (code === 'PRODUCT_NOT_FOUND') {
          await openLookupSheet({
            variant: 'not-found',
            barcode: normalized,
          });
          return;
        }

        await openErrorSheet({
          title: code === 'OFF_UPSTREAM_ERROR' ? 'Service error' : undefined,
          message:
            code === 'OFF_UPSTREAM_ERROR'
              ? 'We couldn’t check this barcode right now. Please try again in a moment.'
              : message,
        });
      }
    },
    [
      analyzeProduct,
      barcodeMutation,
      compareMutation,
      isScannerPaused,
      lastScanRef,
      openComparisonResult,
      openErrorSheet,
      openLookupSheet,
      resetCompare,
      resetTransientBarcodeState,
      rescanCooldownMs,
      scanLockRef,
      setIsLocked,
      setIsResolvingFirstProduct,
      setIsScannerPaused,
    ],
  );

  const handleBarcodeScanned = useCallback(
    async ({ data, bounds, type }: BarcodeScanningResult) => {
      if (scanLockRef.current || isScannerPaused) {
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
      isScannerPaused,
      scanFrameBounds,
      scanLockRef,
      setPendingBarcodeConfirmation,
      submitBarcode,
    ],
  );

  return {
    handleBarcodeScanned,
    submitBarcode,
  };
};





