import type { CompareProductsResponse, PersonalAnalysisJob } from '@acme/shared';
import type { CameraView } from 'expo-camera';
import { useCallback, useState, type MutableRefObject } from 'react';
import { Platform, Vibration } from 'react-native';
import { submitPhotoScan } from '../api/scannerMutations';
import { useCompareStore } from '../stores/compareStore';
import {
  buildBarcodeCompareSource,
  buildCompletedAnalysisJob,
  buildPhotoCompareSource,
  buildPhotoPreviewProduct,
} from '../utils/scannerResultBuilders';
import type { ScannerMode } from '../components/ScannerHomeScreen/ScannerModeSwitch';
import { usePhotoCapture } from './usePhotoCapture';
import type { useCompareProductsMutation } from './useScannerMutations';
import type { BeginResultSheetSession } from './useScannerSheets';

interface UseScannerPhotoFlowInput {
  beginResultSheetSession: BeginResultSheetSession;
  cameraRef: MutableRefObject<CameraView | null>;
  compareMutation: ReturnType<typeof useCompareProductsMutation>;
  handleResultSheetError: (error: unknown, fallbackMessage: string) => Promise<void>;
  hydrateResultSession: (
    sessionId: number,
    payload: { resolvedPersonalResult?: PersonalAnalysisJob },
  ) => void;
  openComparisonResult: (result: CompareProductsResponse) => void;
  openScannerErrorSheet: (error: unknown, fallbackMessage: string) => Promise<void>;
  resetCompare: () => void;
  resumeScanner: () => void;
  scanLockRef: MutableRefObject<boolean>;
  scannerMode: ScannerMode;
  setIsLocked: (value: boolean) => void;
  setIsResolvingFirstProduct: (value: boolean) => void;
  setIsScannerPaused: (value: boolean) => void;
}

export const useScannerPhotoFlow = ({
  beginResultSheetSession,
  cameraRef,
  compareMutation,
  handleResultSheetError,
  hydrateResultSession,
  openComparisonResult,
  openScannerErrorSheet,
  resetCompare,
  resumeScanner,
  scanLockRef,
  scannerMode,
  setIsLocked,
  setIsResolvingFirstProduct,
  setIsScannerPaused,
}: UseScannerPhotoFlowInput) => {
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);

  const capturePhotoWithCamera = useCallback(async () => {
    setIsCapturingPhoto(true);
    Vibration.vibrate(40);

    try {
      const picture = await cameraRef.current?.takePictureAsync({
        quality: 1,
        exif: false,
        shutterSound: false,
        skipProcessing: Platform.OS === 'android',
      });

      if (!picture?.uri || picture.width == null || picture.height == null) {
        return null;
      }

      return {
        uri: picture.uri,
        width: picture.width,
        height: picture.height,
      };
    } finally {
      setIsCapturingPhoto(false);
    }
  }, [cameraRef]);

  const {
    captureAndCompress,
    isPending: isPhotoPending,
    isPreparing: isPreparingPhoto,
  } = usePhotoCapture(capturePhotoWithCamera);

  const runPhotoCaptureFlow = useCallback(async () => {
    try {
      const compareState = useCompareStore.getState();
      const first = compareState.firstProduct;

      if (compareState.isCompareMode && first) {
        const captured = await captureAndCompress();
        if (!captured) {
          resumeScanner();
          return;
        }

        setIsScannerPaused(true);
        setIsResolvingFirstProduct(true);
        const result = await compareMutation.mutateAsync({
          productA: compareState.firstProductPhotoUri
            ? buildPhotoCompareSource(
                compareState.firstProductPhotoUri,
                compareState.firstProductOcr ?? undefined,
              )
            : buildBarcodeCompareSource(first.barcode),
          productB: buildPhotoCompareSource(captured.uploadUri),
        });
        setIsResolvingFirstProduct(false);
        openComparisonResult(result);
        return;
      }

      const captured = await captureAndCompress();
      if (!captured) {
        resumeScanner();
        return;
      }

      setIsScannerPaused(true);
      const sessionId = beginResultSheetSession(
        buildPhotoPreviewProduct(captured.localUri),
        captured.uploadUri,
      );

      try {
        const result = await submitPhotoScan({ photoUri: captured.uploadUri });
        hydrateResultSession(sessionId, {
          resolvedPersonalResult: buildCompletedAnalysisJob(result),
        });
      } catch (error) {
        await handleResultSheetError(error, 'Unable to identify product');
      }
    } catch (error) {
      if (!useCompareStore.getState().isCompareMode) {
        resetCompare();
      }

      await openScannerErrorSheet(error, 'Unable to identify product');
    }
  }, [
    beginResultSheetSession,
    captureAndCompress,
    compareMutation,
    handleResultSheetError,
    hydrateResultSession,
    openComparisonResult,
    openScannerErrorSheet,
    resetCompare,
    resumeScanner,
    setIsResolvingFirstProduct,
    setIsScannerPaused,
  ]);

  const handlePhotoPress = useCallback(async () => {
    if (scanLockRef.current || scannerMode !== 'photo') {
      return;
    }

    scanLockRef.current = true;
    setIsLocked(true);
    await runPhotoCaptureFlow();
  }, [runPhotoCaptureFlow, scanLockRef, scannerMode, setIsLocked]);

  return {
    handlePhotoPress,
    isCapturingPhoto,
    isPhotoPending,
    isPreparingPhoto,
  };
};



