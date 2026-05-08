/* eslint-disable max-lines */

import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { Zap } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager, Linking, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../../../shared/components/BackButton';
import { CustomLoader } from '../../../../shared/components/CustomLoader';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { useBarcodeConfirmation } from '../../hooks/useBarcodeConfirmation';
import { useOpenComparisonRoute } from '../../hooks/useOpenComparisonRoute';
import { useScannerAppState } from '../../hooks/useScannerAppState';
import { useScannerBarcodeFlow } from '../../hooks/useScannerBarcodeFlow';
import { useScannerPhotoFlow } from '../../hooks/useScannerPhotoFlow';
import { useScannerSheets } from '../../hooks/useScannerSheets';
import {
  useCompareProductsMutation,
  useScanBarcodeMutation,
} from '../../hooks/useScannerMutations';
import { useCompareStore } from '../../stores/compareStore';
import type { ScannerRouteMode } from '../../types/scanner';
import {
  BARCODE_FRAME_HEIGHT,
  BARCODE_FRAME_WIDTH,
  type ScannerFrameBounds,
} from '../../utils/scannerBarcodeFrame';
import { getScannerStatusMessage } from '../../utils/scannerResultBuilders';
import { ScannerBottomBar } from './ScannerBottomBar';
import { ScannerModeSwitch, type ScannerMode } from './ScannerModeSwitch';
import { ScannerPermissionState } from '../ScannerPermissionState';

const RESCAN_COOLDOWN_MS = 1500;
const BARCODE_CONFIRMATION_WINDOW_MS = 400;

interface ScannerHomeScreenProps {
  routeMode?: ScannerRouteMode;
}

export function ScannerHomeScreen({ routeMode = 'default' }: ScannerHomeScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const barcodeMutation = useScanBarcodeMutation();
  const compareMutation = useCompareProductsMutation();
  const { openLiveComparison } = useOpenComparisonRoute();

  const compareSessionSource = useCompareStore((s) => s.compareSessionSource);
  const isCompareMode = useCompareStore((s) => s.isCompareMode);
  const firstProduct = useCompareStore((s) => s.firstProduct);
  const resetCompare = useCompareStore((s) => s.reset);
  const isRouteCompareMode = routeMode === 'compare';
  const shouldReturnAfterCompareCancel =
    isRouteCompareMode || compareSessionSource === 'compare-picker';

  const cameraRef = useRef<CameraView | null>(null);
  const scanLockRef = useRef(false);
  const isTransitioningToErrorSheetRef = useRef(false);
  const wasScreenFocusedRef = useRef(true);
  const lastScanRef = useRef<{ barcode: string; timestamp: number } | null>(null);
  const scanFrameRef = useRef<View>(null);
  const scanFrameBounds = useRef<ScannerFrameBounds | null>(null);

  const [isLocked, setIsLocked] = useState(false);
  const [isScannerPaused, setIsScannerPaused] = useState(false);
  const [isScannerErrorSheetOpen, setIsScannerErrorSheetOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<ScannerMode>('scanner');
  const [isTorchEnabled, setIsTorchEnabled] = useState(false);
  const [isResolvingFirstProduct, setIsResolvingFirstProduct] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);

  const {
    clearPendingBarcode,
    isConfirmedBarcode,
    pendingBarcode,
    setPendingBarcodeConfirmation,
  } = useBarcodeConfirmation({ confirmationWindowMs: BARCODE_CONFIRMATION_WINDOW_MS });

  const refreshPermission = useCallback(() => {
    void getPermission();
  }, [getPermission]);
  const { isAppActive } = useScannerAppState(refreshPermission);

  const resetTransientBarcodeState = useCallback(() => {
    clearPendingBarcode();
  }, [clearPendingBarcode]);

  useEffect(() => {
    if (!isRouteCompareMode || firstProduct) {
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/scans');
  }, [firstProduct, isRouteCompareMode, router]);

  const resetCompareIfActive = useCallback(() => {
    if (useCompareStore.getState().isCompareMode) {
      resetCompare();
    }
  }, [resetCompare]);

  const handleCameraPermissionPress = useCallback(() => {
    if (permission && !permission.granted && !permission.canAskAgain) {
      void Linking.openSettings().catch(() => undefined);
      return;
    }

    void requestPermission();
  }, [permission, requestPermission]);

  const handleCloseScanner = useCallback(() => {
    resetTransientBarcodeState();
    resetCompareIfActive();

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/scans');
  }, [resetCompareIfActive, resetTransientBarcodeState, router]);

  const resumeScanner = useCallback(() => {
    isTransitioningToErrorSheetRef.current = false;
    scanLockRef.current = false;
    resetTransientBarcodeState();
    setIsLocked(false);
    setIsScannerPaused(false);
    setIsScannerErrorSheetOpen(false);
    setIsResolvingFirstProduct(false);
  }, [resetTransientBarcodeState]);

  const pauseScannerForErrorSheet = useCallback(() => {
    isTransitioningToErrorSheetRef.current = true;
    scanLockRef.current = true;
    resetTransientBarcodeState();
    setIsLocked(true);
    setIsScannerPaused(true);
    setIsScannerErrorSheetOpen(true);
    setIsResolvingFirstProduct(false);
  }, [resetTransientBarcodeState]);

  const handleCancelCompare = useCallback(() => {
    resetTransientBarcodeState();
    resetCompare();
    resumeScanner();

    if (shouldReturnAfterCompareCancel) {
      handleCloseScanner();
    }
  }, [
    handleCloseScanner,
    resetCompare,
    resetTransientBarcodeState,
    resumeScanner,
    shouldReturnAfterCompareCancel,
  ]);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);

      if (!wasScreenFocusedRef.current) {
        resumeScanner();
      }

      wasScreenFocusedRef.current = true;

      return () => {
        wasScreenFocusedRef.current = false;
        setIsScreenFocused(false);
        resetTransientBarcodeState();
        resetCompareIfActive();
      };
    }, [resetCompareIfActive, resetTransientBarcodeState, resumeScanner]),
  );

  const handleModeChange = useCallback(
    (nextMode: ScannerMode) => {
      if (scanLockRef.current || nextMode === scannerMode) {
        return;
      }

      resetTransientBarcodeState();
      setIsTorchEnabled(false);
      setScannerMode(nextMode);
    },
    [resetTransientBarcodeState, scannerMode],
  );

  const switchToPhotoMode = useCallback(() => {
    resetTransientBarcodeState();
    setIsTorchEnabled(false);
    setScannerMode('photo');
    resumeScanner();
  }, [resetTransientBarcodeState, resumeScanner]);

  const openComparisonResult = useCallback(
    (result: Parameters<typeof openLiveComparison>[0]) => {
      openLiveComparison(result, { replaceCurrentRoute: isRouteCompareMode });

      InteractionManager.runAfterInteractions(() => {
        resetCompare();
      });
    },
    [isRouteCompareMode, openLiveComparison, resetCompare],
  );

  const {
    beginResultSheetSession,
    handleResultSheetError,
    hydrateResultSession,
    openScannerErrorSheet,
  } = useScannerSheets({
    isScannerErrorSheetOpen,
    isTransitioningToErrorSheetRef,
    pauseScannerForErrorSheet,
    resumeScanner,
    setIsScannerErrorSheetOpen,
    switchToPhotoMode,
  });

  const {
    handlePhotoPress,
    isCapturingPhoto,
    isPhotoPending,
    isPreparingPhoto,
  } = useScannerPhotoFlow({
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
  });

  const { handleBarcodeScanned } = useScannerBarcodeFlow({
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
    rescanCooldownMs: RESCAN_COOLDOWN_MS,
    scanFrameBounds,
    scanLockRef,
    setIsLocked,
    setIsScannerPaused,
    setPendingBarcodeConfirmation,
  });

  const toggleTorch = useCallback(() => {
    if (!scanLockRef.current) {
      setIsTorchEnabled((current) => !current);
    }
  }, []);

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    const isCameraPermissionBlocked = !permission.canAskAgain;

    return (
      <ScannerPermissionState
        title={isCameraPermissionBlocked ? 'Turn on camera access' : 'Camera access required'}
        description={
          isCameraPermissionBlocked
            ? 'Camera access is turned off for this app. Enable it in Settings to scan barcodes and take photos.'
            : 'We’ll need access to your camera to scan barcodes and take photos.'
        }
        buttonLabel={isCameraPermissionBlocked ? 'Open Settings' : 'Allow camera'}
        onClose={handleCloseScanner}
        onPress={handleCameraPermissionPress}
      />
    );
  }

  const isProcessing =
    isPhotoPending ||
    barcodeMutation.isPending ||
    compareMutation.isPending ||
    isResolvingFirstProduct;
  const statusMessage = getScannerStatusMessage({
    isPhotoPending,
    isPreparingPhoto,
    isResolvingFirstProduct,
    isBarcodePending: barcodeMutation.isPending,
    isComparePending: compareMutation.isPending,
  });
  const scannerHintMessage = pendingBarcode
    ? 'Scan the same barcode again to confirm'
    : 'Align the barcode inside the frame';
  const isPhotoMode = scannerMode === 'photo';
  const showCompareBanner = isCompareMode && Boolean(firstProduct);
  const shouldSuspendCameraView =
    !isAppActive ||
    !isScreenFocused ||
    isScannerErrorSheetOpen ||
    isScannerPaused ||
    (isLocked && isPhotoMode && !isCapturingPhoto);
  const showCameraBlackout =
    !isAppActive || !isScreenFocused || (isLocked && (isPhotoMode || isScannerPaused));

  return (
    <View className="flex-1 bg-black">
      {!shouldSuspendCameraView ? (
        <CameraView
          ref={cameraRef}
          active
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
          }}
          enableTorch={isTorchEnabled}
          facing="back"
          onBarcodeScanned={!isPhotoMode ? handleBarcodeScanned : undefined}
          style={{ flex: 1 }}
        />
      ) : null}

      {showCameraBlackout ? <View pointerEvents="none" className="absolute inset-0 bg-black" /> : null}

      {isLocked && isProcessing ? (
        <View className="absolute inset-0 items-center justify-center px-6">
          <View
            className="items-center rounded-[22px] px-6 py-3"
            style={{ backgroundColor: COLORS.overlayStrong, minWidth: 180, maxWidth: 250 }}
          >
            <CustomLoader size="md" />
            <Typography className="mt-4 text-center text-[13px] text-white">
              {statusMessage}
            </Typography>
          </View>
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        className="absolute inset-0 px-5"
        style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 18 }}
      >
        <View className="flex-row items-center">
          <BackButton
            variant="dark"
            icon="close"
            accessibilityLabel={
              showCompareBanner && shouldReturnAfterCompareCancel
                ? 'Cancel comparison and close scanner'
                : 'Close scanner'
            }
            onPress={
              showCompareBanner && shouldReturnAfterCompareCancel
                ? handleCancelCompare
                : handleCloseScanner
            }
          />

          <View className="flex-1 items-center px-3">
            {!isLocked ? <ScannerModeSwitch mode={scannerMode} onChange={handleModeChange} /> : null}
          </View>

          <TouchableOpacity
            accessibilityLabel={isTorchEnabled ? 'Turn flashlight off' : 'Turn flashlight on'}
            accessibilityRole="button"
            activeOpacity={0.7}
            className="h-11 w-11 items-center justify-center rounded-full"
            disabled={isLocked}
            style={{
              backgroundColor: isTorchEnabled ? COLORS.primary : COLORS.overlay,
              opacity: isLocked ? 0.4 : 1,
            }}
            onPress={toggleTorch}
          >
            <Zap
              color={COLORS.white}
              size={18}
              fill={isTorchEnabled ? COLORS.white : COLORS.transparent}
            />
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center pb-12">
          {!isLocked && !isPhotoMode ? (
            <View className="items-center">
              <View
                className="mb-5 rounded-xl px-4 py-2"
                style={{ backgroundColor: COLORS.overlayStrong }}
              >
                <Typography variant="bodySecondary" className="text-center text-white">
                  {scannerHintMessage}
                </Typography>
              </View>

              <View
                ref={scanFrameRef}
                className="rounded-[32px] border-2 border-white/80 bg-white/5"
                style={{ width: BARCODE_FRAME_WIDTH, height: BARCODE_FRAME_HEIGHT }}
                onLayout={() => {
                  scanFrameRef.current?.measureInWindow((x, y, width, height) => {
                    scanFrameBounds.current = { x, y, w: width, h: height };
                  });
                }}
              />
            </View>
          ) : null}
        </View>

        {!isLocked ? (
          <ScannerBottomBar
            mode={scannerMode}
            isCompareMode={showCompareBanner}
            isLocked={isLocked}
            onCapturePress={() => void handlePhotoPress()}
            onCancelCompare={handleCancelCompare}
          />
        ) : (
          <View style={{ minHeight: 56 }} />
        )}
      </View>
    </View>
  );
}
