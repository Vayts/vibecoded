import type { ProductPreview } from '@acme/shared';
import { useCallback, type RefObject } from 'react';
import { SheetManager } from 'react-native-actions-sheet';
import { ScannerApiError } from '../api/scannerMutations';
import { useScannerResultSheetStore } from '../stores/scannerResultSheetStore';
import { SheetsEnum } from '../../../shared/types/sheets';

const NOT_FOOD_MESSAGE =
  'The photo does not appear to show a food or drink product. Please scan a food item instead.';
const INSUFFICIENT_PRODUCT_DATA_TITLE = 'Not enough information about product';
const INSUFFICIENT_PRODUCT_DATA_MESSAGE =
  'We found this barcode, but there is not enough product data to analyze it safely. ' +
  'Try another product or take a clear photo of the label.';
const SAME_PRODUCT_MESSAGE =
  'We identified the same product in both scans. Scan a different product to compare.';
const PACKAGING_REQUIRED_TITLE = 'We need a packaged product';
const PACKAGING_REQUIRED_MESSAGE =
  'Take a photo of a packaged food or drink with a visible label, ingredients, or nutrition facts panel.';

export type BeginResultSheetSession = (
  previewProduct?: ProductPreview,
  photoUri?: string,
) => number;

interface UseScannerSheetsInput {
  isScannerErrorSheetOpen: boolean;
  isTransitioningToErrorSheetRef: RefObject<boolean>;
  pauseScannerForErrorSheet: () => void;
  resumeScanner: () => void;
  setIsScannerErrorSheetOpen: (value: boolean) => void;
  switchToPhotoMode: () => void;
}

export const useScannerSheets = ({
  isScannerErrorSheetOpen,
  isTransitioningToErrorSheetRef,
  pauseScannerForErrorSheet,
  resumeScanner,
  setIsScannerErrorSheetOpen,
  switchToPhotoMode,
}: UseScannerSheetsInput) => {
  const startResultSession = useScannerResultSheetStore((s) => s.startSession);
  const hydrateResultSession = useScannerResultSheetStore((s) => s.hydrateSession);
  const resetResultSession = useScannerResultSheetStore((s) => s.reset);

  const handleScannerErrorSheetDismiss = useCallback(() => {
    resumeScanner();
  }, [resumeScanner]);

  const handleScannerErrorSheetPhotoPress = useCallback(() => {
    isTransitioningToErrorSheetRef.current = false;
    setIsScannerErrorSheetOpen(false);
    switchToPhotoMode();
  }, [isTransitioningToErrorSheetRef, setIsScannerErrorSheetOpen, switchToPhotoMode]);

  const openScannerErrorSheet = useCallback(
    async (error: unknown, fallbackMessage: string) => {
      pauseScannerForErrorSheet();

      const errorMessage = error instanceof Error ? error.message : fallbackMessage;
      const errorCode = error instanceof ScannerApiError ? error.code : undefined;
      const isRetriableNotFound =
        errorCode === 'PRODUCT_NOT_FOUND' || errorMessage.toLowerCase().includes('not found');
      const isSameProduct = errorCode === 'SAME_PRODUCT';
      const isInsufficientData = errorCode === 'INSUFFICIENT_PRODUCT_DATA';
      const isPackagingRequired = errorCode === 'PACKAGED_PRODUCT_REQUIRED';
      const offersPhotoAction = isRetriableNotFound || isInsufficientData;

      await SheetManager.show(SheetsEnum.ScannerErrorSheet, {
        payload: {
          variant:
            errorCode === 'NOT_FOOD'
              ? 'not-food'
              : isPackagingRequired
                ? 'packaging-required'
              : isInsufficientData
                ? 'insufficient-data'
                : isRetriableNotFound
                  ? 'not-found'
                  : isSameProduct
                    ? 'same-product'
                    : 'generic',
          title:
            errorCode === 'NOT_FOOD'
              ? 'This is not a food product'
              : isPackagingRequired
                ? PACKAGING_REQUIRED_TITLE
              : isInsufficientData
                ? INSUFFICIENT_PRODUCT_DATA_TITLE
                : isSameProduct
                  ? 'This is the same product'
                  : undefined,
          message:
            errorCode === 'NOT_FOOD'
              ? NOT_FOOD_MESSAGE
              : isPackagingRequired
                ? PACKAGING_REQUIRED_MESSAGE
              : isInsufficientData
                ? INSUFFICIENT_PRODUCT_DATA_MESSAGE
                : isSameProduct
                  ? SAME_PRODUCT_MESSAGE
                  : errorMessage,
          onDismiss: handleScannerErrorSheetDismiss,
          onPhotoPress: offersPhotoAction ? handleScannerErrorSheetPhotoPress : undefined,
        },
      });
    },
    [handleScannerErrorSheetDismiss, handleScannerErrorSheetPhotoPress, pauseScannerForErrorSheet],
  );

  const handleResultSheetClose = useCallback(() => {
    if (isTransitioningToErrorSheetRef.current || isScannerErrorSheetOpen) {
      return;
    }

    resumeScanner();
  }, [isScannerErrorSheetOpen, isTransitioningToErrorSheetRef, resumeScanner]);

  const beginResultSheetSession = useCallback(
    (previewProduct?: ProductPreview, photoUri?: string) => {
      const sessionId = startResultSession();

      void SheetManager.show(SheetsEnum.ScannerResultSheet, {
        payload: {
          ...(previewProduct ? { previewProduct } : {}),
          ...(photoUri ? { photoUri } : {}),
          onBeforeErrorSheetOpen: pauseScannerForErrorSheet,
          onErrorSheetDismiss: handleScannerErrorSheetDismiss,
        },
        onClose: handleResultSheetClose,
      });

      return sessionId;
    },
    [
      handleResultSheetClose,
      handleScannerErrorSheetDismiss,
      pauseScannerForErrorSheet,
      startResultSession,
    ],
  );

  const handleResultSheetError = useCallback(
    async (error: unknown, fallbackMessage: string) => {
      resetResultSession();
      await SheetManager.hide(SheetsEnum.ScannerResultSheet);
      await openScannerErrorSheet(error, fallbackMessage);
    },
    [openScannerErrorSheet, resetResultSession],
  );

  return {
    beginResultSheetSession,
    handleResultSheetError,
    hydrateResultSession,
    openScannerErrorSheet,
  };
};
