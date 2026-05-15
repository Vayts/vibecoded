import { useCallback } from 'react';
import { SheetManager } from 'react-native-actions-sheet';
import { useRouter } from 'expo-router';
import { InteractionManager } from 'react-native';
import { SheetsEnum } from '../../../shared/types/sheets';

interface OpenLookupSheetInput {
  variant: 'found' | 'not-found';
  barcode: string;
  productName?: string | null;
  brandName?: string | null;
  imageUrl?: string | null;
  onAnalyzePress?: () => void;
}

interface OpenErrorSheetInput {
  title?: string;
  message: string;
  actionLabel?: string;
}

interface UseBarcodeScannerSheetsInput {
  pauseScanner: () => void;
  resumeScanner: () => void;
}

export const useBarcodeScannerSheets = ({
  pauseScanner,
  resumeScanner,
}: UseBarcodeScannerSheetsInput) => {
  const router = useRouter();

  const openLookupSheet = useCallback(
    async (input: OpenLookupSheetInput) => {
      pauseScanner();

      await SheetManager.show(SheetsEnum.BarcodeScannerLookupSheet, {
        payload: {
          ...input,
          onDismiss: resumeScanner,
          onPhotoPress:
            input.variant === 'not-found'
              ? () => {
                  InteractionManager.runAfterInteractions(() => {
                    router.push('/scanner/photo');
                  });
                }
              : undefined,
        },
      });
    },
    [pauseScanner, resumeScanner, router],
  );

  const openErrorSheet = useCallback(
    async (input: OpenErrorSheetInput) => {
      pauseScanner();

      await SheetManager.show(SheetsEnum.BarcodeScannerErrorSheet, {
        payload: {
          ...input,
          onDismiss: resumeScanner,
        },
      });
    },
    [pauseScanner, resumeScanner],
  );

  return {
    openErrorSheet,
    openLookupSheet,
  };
};

