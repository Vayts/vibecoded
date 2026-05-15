import { useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager, Linking, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOpenComparisonRoute } from '../../scanner/hooks/useOpenComparisonRoute';
import { useCompareProductsMutation } from '../../scanner/hooks/useScannerMutations';
import { useCompareStore } from '../../scanner/stores/compareStore';
import { useBarcodeConfirmation } from './useBarcodeConfirmation';
import { useBarcodeScannerAnalyzeFlow } from './useBarcodeScannerAnalyzeFlow';
import { useBarcodeScannerAppState } from './useBarcodeScannerAppState';
import { useBarcodeScannerFlow } from './useBarcodeScannerFlow';
import { useBarcodeScannerLookupMutation } from './useBarcodeScannerMutations';
import { useBarcodeScannerSheets } from './useBarcodeScannerSheets';
import type { BarcodeScannerRouteMode } from '../types/barcodeScanner';
import type { BarcodeScannerFrameBounds } from '../utils/barcodeScannerFrame';

const RESCAN_COOLDOWN_MS = 1500;
const BARCODE_CONFIRMATION_WINDOW_MS = 400;

interface UseBarcodeScannerControllerInput {
  routeMode: BarcodeScannerRouteMode;
}

export const useBarcodeScannerController = ({
  routeMode,
}: UseBarcodeScannerControllerInput) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const barcodeMutation = useBarcodeScannerLookupMutation();
  const compareMutation = useCompareProductsMutation();
  const { openLiveComparison } = useOpenComparisonRoute();
  const compareSessionSource = useCompareStore((state) => state.compareSessionSource);
  const isCompareMode = useCompareStore((state) => state.isCompareMode);
  const firstProduct = useCompareStore((state) => state.firstProduct);
  const resetCompare = useCompareStore((state) => state.reset);
  const isRouteCompareMode = routeMode === 'compare';
  const shouldReturnAfterCompareCancel =
    isRouteCompareMode || compareSessionSource === 'compare-picker';
  const scanLockRef = useRef(false);
  const wasScreenFocusedRef = useRef(true);
  const lastScanRef = useRef<{ barcode: string; timestamp: number } | null>(null);
  const scanFrameRef = useRef<View>(null);
  const scanFrameBounds = useRef<BarcodeScannerFrameBounds | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isScannerPaused, setIsScannerPaused] = useState(false);
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
  const { isAppActive } = useBarcodeScannerAppState(refreshPermission);
  const resetTransientBarcodeState = useCallback(() => {
    clearPendingBarcode();
  }, [clearPendingBarcode]);
  const resetCompareIfActive = useCallback(() => {
    if (useCompareStore.getState().isCompareMode) {
      resetCompare();
    }
  }, [resetCompare]);
  const resumeScanner = useCallback(() => {
    scanLockRef.current = false;
    resetTransientBarcodeState();
    setIsLocked(false);
    setIsScannerPaused(false);
    setIsResolvingFirstProduct(false);
  }, [resetTransientBarcodeState]);
  const pauseScanner = useCallback(() => {
    scanLockRef.current = true;
    resetTransientBarcodeState();
    setIsLocked(true);
    setIsScannerPaused(true);
    setIsResolvingFirstProduct(false);
  }, [resetTransientBarcodeState]);
  const { openErrorSheet, openLookupSheet } = useBarcodeScannerSheets({
    pauseScanner,
    resumeScanner,
  });
  const { analyzeProduct } = useBarcodeScannerAnalyzeFlow({
    pauseScanner,
    resumeScanner,
  });

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

  const openComparisonResult = useCallback(
    (result: Parameters<typeof openLiveComparison>[0]) => {
      openLiveComparison(result, { replaceCurrentRoute: isRouteCompareMode });
      InteractionManager.runAfterInteractions(() => {
        resetCompare();
      });
    },
    [isRouteCompareMode, openLiveComparison, resetCompare],
  );

  const { handleBarcodeScanned } = useBarcodeScannerFlow({
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
    rescanCooldownMs: RESCAN_COOLDOWN_MS,
    scanFrameBounds,
    scanLockRef,
    setIsLocked,
    setIsResolvingFirstProduct,
    setIsScannerPaused,
    setPendingBarcodeConfirmation,
  });

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
  const handleCancelCompare = useCallback(() => {
    resetTransientBarcodeState();
    resetCompare();
    resumeScanner();
    if (shouldReturnAfterCompareCancel) {
      handleCloseScanner();
    }
  }, [handleCloseScanner, resetCompare, resetTransientBarcodeState, resumeScanner, shouldReturnAfterCompareCancel]);
  const toggleTorch = useCallback(() => {
    if (!scanLockRef.current) {
      setIsTorchEnabled((current) => !current);
    }
  }, []);

  return {
    barcodeMutation,
    compareMutation,
    firstProduct,
    handleBarcodeScanned,
    handleCameraPermissionPress,
    handleCancelCompare,
    handleCloseScanner,
    insets,
    isAppActive,
    isCompareMode,
    isLocked,
    isResolvingFirstProduct,
    isRouteCompareMode,
    isScannerPaused,
    isScreenFocused,
    isTorchEnabled,
    pendingBarcode,
    permission,
    scanFrameBounds,
    scanFrameRef,
    shouldReturnAfterCompareCancel,
    toggleTorch,
  };
};

