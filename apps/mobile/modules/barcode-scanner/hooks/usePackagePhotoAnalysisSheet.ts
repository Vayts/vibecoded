import type { ProductPreview } from '@acme/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { SheetManager } from 'react-native-actions-sheet';
import { SheetsEnum } from '../../../shared/types/sheets';
import { SCAN_HISTORY_QUERY_KEY } from '../../scans/hooks/useScanHistoryQuery';
import { useScannerResultSheetStore } from '../../scanner/stores/scannerResultSheetStore';
import {
  buildCompletedAnalysisJob,
  buildCompletedBarcodeLookupResponse,
} from '../../scanner/utils/scannerResultBuilders';
import type { PackagePhotosUploadResponse } from '../api/barcodeScannerMutations';
import type { CapturedProductPhoto } from '../types/productPhotoCapture';

interface PackagePhotoAnalysisSheetOptions {
  onCompleted: () => void;
}

const buildPackagePhotoPreview = (barcode: string, photos: CapturedProductPhoto[]): ProductPreview => ({
  productId: '',
  barcode,
  product_name: null,
  product_name_english: null,
  brands: null,
  image_url: photos[0]?.uri ?? null,
});

export const usePackagePhotoAnalysisSheet = ({ onCompleted }: PackagePhotoAnalysisSheetOptions) => {
  const queryClient = useQueryClient();
  const shouldCompleteOnCloseRef = useRef(true);
  const startResultSession = useScannerResultSheetStore((state) => state.startSession);
  const hydrateResultSession = useScannerResultSheetStore((state) => state.hydrateSession);
  const resetResultSession = useScannerResultSheetStore((state) => state.reset);

  const openAnalysisSheet = (barcode: string, photos: CapturedProductPhoto[]) => {
    shouldCompleteOnCloseRef.current = true;
    const sessionId = startResultSession();

    void SheetManager.show(SheetsEnum.ScannerResultSheet, {
      payload: {
        previewProduct: buildPackagePhotoPreview(barcode, photos),
        photoUri: photos[0]?.uri,
      },
      onClose: () => {
        if (shouldCompleteOnCloseRef.current) {
          onCompleted();
        }
      },
    });

    return sessionId;
  };

  const hydrateAnalysisSheet = (sessionId: number, result: PackagePhotosUploadResponse) => {
    hydrateResultSession(sessionId, {
      result: buildCompletedBarcodeLookupResponse({
        barcode: result.barcode,
        source: 'photo',
        result,
      }),
      resolvedPersonalResult: buildCompletedAnalysisJob(result),
    });
    void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
  };

  const closeAnalysisSheetAfterError = async () => {
    shouldCompleteOnCloseRef.current = false;
    resetResultSession();
    await SheetManager.hide(SheetsEnum.ScannerResultSheet);
    shouldCompleteOnCloseRef.current = true;
  };

  return {
    closeAnalysisSheetAfterError,
    hydrateAnalysisSheet,
    openAnalysisSheet,
  };
};

