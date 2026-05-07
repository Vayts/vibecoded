import type { ProductPreview } from '@acme/shared';
import { useCallback, type RefObject } from 'react';
import { SheetManager } from 'react-native-actions-sheet';
import { ScannerApiError } from '../api/scannerMutations';
import { useScannerResultSheetStore } from '../stores/scannerResultSheetStore';
import { SheetsEnum } from '../../../shared/types/sheets';

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

      await SheetManager.show(SheetsEnum.ScannerErrorSheet, {
        payload: {
          variant:
            errorCode === 'NOT_FOOD'
              ? 'not-food'
              : isRetriableNotFound
                ? 'not-found'
                : isSameProduct
                  ? 'same-product'
                  : 'generic',
          title:
            errorCode === 'NOT_FOOD'
              ? 'This is not a food product'
              : isSameProduct
                ? 'This is the same product'
                : undefined,
          message:
            errorCode === 'NOT_FOOD'
              ? 'The photo does not appear to show a food or drink product. Please scan a food item instead.'
              : isSameProduct
                ? 'We identified the same product in both scans. Scan a different product to compare.'
                : errorMessage,
          onDismiss: handleScannerErrorSheetDismiss,
          onPhotoPress: isRetriableNotFound ? handleScannerErrorSheetPhotoPress : undefined,
        },
      });
    },
    [
      handleScannerErrorSheetDismiss,
      handleScannerErrorSheetPhotoPress,
      pauseScannerForErrorSheet,
    ],
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

