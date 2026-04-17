import {
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { Zap } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  Dimensions,
  Linking,
  Platform,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../../../shared/components/BackButton';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { SheetsEnum } from '../../../../shared/types/sheets';
import {
  useCompareProductsMutation,
  useProductLookupMutation,
} from '../../hooks/useScannerMutations';
import { usePhotoCapture } from '../../hooks/usePhotoCapture';
import { ScannerApiError, submitPhotoScan } from '../../api/scannerMutations';
import { useOpenComparisonRoute } from '../../hooks/useOpenComparisonRoute';
import { useCompareStore } from '../../stores/compareStore';
import { ScannerBottomBar } from './ScannerBottomBar';
import { ScannerModeSwitch, type ScannerMode } from './ScannerModeSwitch';
import { ScannerPermissionState } from '../ScannerPermissionState';
import { CustomLoader } from '../../../../shared/components/CustomLoader';

const RESCAN_COOLDOWN_MS = 1500;
const BARCODE_FRAME_WIDTH = Math.min(Dimensions.get('window').width - 48, 300);
const BARCODE_FRAME_HEIGHT = 200;
const BARCODE_DETECTION_PADDING = 20;

export function ScannerHomeScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const lookupMutation = useProductLookupMutation();
  const compareMutation = useCompareProductsMutation();
  const { openLiveComparison } = useOpenComparisonRoute();

  const isCompareMode = useCompareStore((s) => s.isCompareMode);
  const firstProduct = useCompareStore((s) => s.firstProduct);
  const resetCompare = useCompareStore((s) => s.reset);

  const cameraRef = useRef<CameraView | null>(null);
  const scanLockRef = useRef(false);
  const wasScreenFocusedRef = useRef(true);
  const lastScanRef = useRef<{ barcode: string; timestamp: number } | null>(null);
  const scanFrameRef = useRef<View>(null);
  const scanFrameBounds = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const [isLocked, setIsLocked] = useState(false);
  const [isScannerPaused, setIsScannerPaused] = useState(false);
  const [scannerMode, setScannerMode] = useState<ScannerMode>('scanner');
  const [isTorchEnabled, setIsTorchEnabled] = useState(false);
  const [isResolvingFirstProduct, setIsResolvingFirstProduct] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (appState !== 'active') {
      return;
    }

    void getPermission();
  }, [appState, getPermission]);

  const handleCameraPermissionPress = useCallback(() => {
    if (permission && !permission.granted && permission.canAskAgain === false) {
      void Linking.openSettings().catch(() => undefined);
      return;
    }

    void requestPermission();
  }, [permission, requestPermission]);

  const resumeScanner = useCallback(() => {
    scanLockRef.current = false;
    setIsLocked(false);
    setIsScannerPaused(false);
    setIsResolvingFirstProduct(false);
  }, []);

  const [isScreenFocused, setIsScreenFocused] = useState(true);

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
      };
    }, [resumeScanner]),
  );

  const capturePhotoWithCamera = useCallback(async () => {
    setIsCapturingPhoto(true);

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

      Vibration.vibrate(40);

      return {
        uri: picture.uri,
        width: picture.width,
        height: picture.height,
      };
    } finally {
      setIsCapturingPhoto(false);
    }
  }, []);

  const {
    captureAndCompress,
    capturePhotoPreview,
    isPending: isPhotoPending,
    isPreparing: isPreparingPhoto,
  } = usePhotoCapture(capturePhotoWithCamera);

  const handleModeChange = useCallback(
    (nextMode: ScannerMode) => {
      if (scanLockRef.current || nextMode === scannerMode) {
        return;
      }

      setScannerMode(nextMode);
    },
    [scannerMode],
  );

  const switchToPhotoMode = useCallback(() => {
    setScannerMode('photo');
    resumeScanner();
  }, [resumeScanner]);

  const openScannerErrorSheet = useCallback(
    async (error: unknown, fallbackMessage: string) => {
      const errorMessage = error instanceof Error ? error.message : fallbackMessage;
      const errorCode = error instanceof ScannerApiError ? error.code : undefined;
      const isRetriableNotFound =
        errorCode === 'PRODUCT_NOT_FOUND' ||
        errorMessage.toLowerCase().includes('not found');
      const isSameProduct = errorCode === 'SAME_PRODUCT';

      await SheetManager.show(SheetsEnum.ScannerErrorSheet, {
        payload: {
          variant: errorCode === 'NOT_FOOD'
            ? 'not-food'
            : isRetriableNotFound
              ? 'not-found'
              : isSameProduct
                ? 'same-product'
                : 'generic',
          title: errorCode === 'NOT_FOOD'
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
          onDismiss: resumeScanner,
          onPhotoPress: isRetriableNotFound ? switchToPhotoMode : undefined,
        },
      });
    },
    [resumeScanner, switchToPhotoMode],
  );

  const toggleTorch = useCallback(() => {
    if (scanLockRef.current) {
      return;
    }

    setIsTorchEnabled((current) => !current);
  }, []);

  const runPhotoCaptureFlow = useCallback(async () => {
    try {
      const compareActive = useCompareStore.getState().isCompareMode;
      const first = useCompareStore.getState().firstProduct;

      if (compareActive && first) {
        const firstPhotoUri = useCompareStore.getState().firstProductPhotoUri;
        const firstProductOcr = useCompareStore.getState().firstProductOcr;

        const captured = await captureAndCompress();
        if (!captured) {
          resumeScanner();
          return;
        }

        setIsScannerPaused(true);
        setIsResolvingFirstProduct(true);
        const [firstResolved, secondResolved] = await Promise.all([
          firstPhotoUri
            ? submitPhotoScan({ photoUri: firstPhotoUri, ocr: firstProductOcr ?? undefined })
            : Promise.resolve({ barcode: first.barcode }),
          submitPhotoScan({ photoUri: captured.uploadUri }),
        ]);
        setIsResolvingFirstProduct(false);

        const result = await compareMutation.mutateAsync({
          barcode1: firstResolved.barcode,
          barcode2: secondResolved.barcode,
        });
        resetCompare();
        openLiveComparison(result);
        return;
      }

      const preview = await capturePhotoPreview();
      if (!preview) {
        resumeScanner();
        return;
      }

      setIsScannerPaused(true);
      const productPreview = {
        productId: '',
        barcode: '',
        product_name: preview.productName,
        brands: preview.brand,
        image_url: preview.localImageUri,
      };

      await SheetManager.show(SheetsEnum.ProductDecisionSheet, {
        payload: {
          product: productPreview,
          photoUri: preview.photoUri,
          photoOcr: preview.ocr,
          onDismiss: resumeScanner,
        },
      });
    } catch (error) {
      if (!useCompareStore.getState().isCompareMode) {
        resetCompare();
      }

      await openScannerErrorSheet(error, 'Unable to identify product');
    }
  }, [
    captureAndCompress,
    capturePhotoPreview,
    compareMutation,
    openScannerErrorSheet,
    openLiveComparison,
    resetCompare,
    resumeScanner,
  ]);

  const handlePhotoPress = useCallback(async () => {
    if (scanLockRef.current || scannerMode !== 'photo') {
      return;
    }

    scanLockRef.current = true;
    setIsLocked(true);
    await runPhotoCaptureFlow();
  }, [runPhotoCaptureFlow, scannerMode]);

  const submitBarcode = useCallback(async (barcode: string) => {
    const normalized = barcode.trim();
    if (!normalized || scanLockRef.current) {
      return;
    }

    const now = Date.now();
    const prev = lastScanRef.current;
    if (prev && prev.barcode === normalized && now - prev.timestamp < RESCAN_COOLDOWN_MS) {
      return;
    }

    scanLockRef.current = true;
    lastScanRef.current = { barcode: normalized, timestamp: now };
    setIsLocked(true);
    setIsScannerPaused(true);

    try {
      const compareActive = useCompareStore.getState().isCompareMode;
      const first = useCompareStore.getState().firstProduct;

      if (compareActive && first) {
        const firstPhotoUri = useCompareStore.getState().firstProductPhotoUri;
        const firstProductOcr = useCompareStore.getState().firstProductOcr;

        let barcode1: string;
        if (firstPhotoUri) {
          setIsResolvingFirstProduct(true);
          const firstResolved = await submitPhotoScan({
            photoUri: firstPhotoUri,
            ocr: firstProductOcr ?? undefined,
          });
          setIsResolvingFirstProduct(false);
          barcode1 = firstResolved.barcode;
        } else {
          barcode1 = first.barcode;
        }

        if (barcode1.trim() === normalized) {
          resumeScanner();
          return;
        }

        const result = await compareMutation.mutateAsync({
          barcode1,
          barcode2: normalized,
        });
        resetCompare();
        openLiveComparison(result);
        return;
      }

      const lookupResult = await lookupMutation.mutateAsync({ barcode: normalized });
      await SheetManager.show(SheetsEnum.ProductDecisionSheet, {
        payload: { product: lookupResult.product, onDismiss: resumeScanner },
      });
    } catch (error) {
      if (!useCompareStore.getState().isCompareMode) {
        resetCompare();
      }

      await openScannerErrorSheet(error, 'Unable to submit barcode');
    }
  }, [compareMutation, lookupMutation, openLiveComparison, openScannerErrorSheet, resetCompare, resumeScanner]);

  const handleBarcodeScanned = async ({ data, bounds }: BarcodeScanningResult) => {
    if (Platform.OS !== 'ios' && bounds && scanFrameBounds.current) {
      const frame = scanFrameBounds.current;
      const centerX = bounds.origin.x + bounds.size.width / 2;
      const centerY = bounds.origin.y + bounds.size.height / 2;
      const inFrame =
        centerX >= frame.x - BARCODE_DETECTION_PADDING &&
        centerX <= frame.x + frame.w + BARCODE_DETECTION_PADDING &&
        centerY >= frame.y - BARCODE_DETECTION_PADDING &&
        centerY <= frame.y + frame.h + BARCODE_DETECTION_PADDING;

      if (!inFrame) {
        return;
      }
    }

    await submitBarcode(data);
  };

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    const isCameraPermissionBlocked = permission.canAskAgain === false;

    return (
      <ScannerPermissionState
        title={isCameraPermissionBlocked ? 'Turn on camera access' : 'Camera access required'}
        description={
          isCameraPermissionBlocked
            ? 'Camera access is turned off for this app. Enable it in Settings to scan barcodes and take photos.'
            : 'We’ll need access to your camera to scan barcodes and take photos.'
        }
        buttonLabel={isCameraPermissionBlocked ? 'Open Settings' : 'Allow camera'}
        onPress={handleCameraPermissionPress}
      />
    );
  }

  const isProcessing =
    isPhotoPending ||
    compareMutation.isPending ||
    lookupMutation.isPending ||
    isResolvingFirstProduct;

  const statusMessage = isPhotoPending
    ? isPreparingPhoto
      ? 'Capturing photo…'
      : 'Identifying product…'
    : isResolvingFirstProduct
      ? 'Identifying products…'
      : compareMutation.isPending
        ? 'Comparing products…'
        : lookupMutation.isPending
          ? 'Looking up product…'
          : 'Processing…';

  const isPhotoMode = scannerMode === 'photo';
  const isAppActive = appState === 'active';
  const showCompareBanner = isCompareMode && Boolean(firstProduct);
  const shouldSuspendCameraView =
    !isAppActive || !isScreenFocused || isScannerPaused || (isLocked && isPhotoMode && !isCapturingPhoto);
  const shouldRenderCameraView = !shouldSuspendCameraView;
  const showCameraBlackout = !isAppActive || !isScreenFocused || (isLocked && (isPhotoMode || isScannerPaused));

  return (
    <View className="flex-1 bg-black">
      {shouldRenderCameraView ? (
        <CameraView
          ref={cameraRef}
          active
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
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
            style={{
              backgroundColor: COLORS.overlayStrong,
              minWidth: 180,
              maxWidth: 250,
            }}
          >
            <CustomLoader size="md" />
            <Typography className="mt-4 text-[13px] text-center text-white">
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
          <BackButton variant="dark" icon="close" accessibilityLabel="Close scanner" />

          <View className="flex-1 items-center px-3">
            {!isLocked ? (
              <ScannerModeSwitch mode={scannerMode} onChange={handleModeChange} />
            ) : null}
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
          {!isLocked ? (
            <View className="items-center">
              {!isPhotoMode ? (
                <View className="items-center">
                  <View
                    className="mb-5 rounded-xl px-4 py-2"
                    style={{ backgroundColor: COLORS.overlayStrong }}
                  >
                    <Typography variant="bodySecondary" className="text-center text-white">
                      Alling the barcode inside the frame
                    </Typography>
                  </View>

                  <View
                    ref={scanFrameRef}
                    className="rounded-[32px] border-2 border-white/80 bg-white/5"
                    style={{
                      width: BARCODE_FRAME_WIDTH,
                      height: BARCODE_FRAME_HEIGHT,
                    }}
                    onLayout={() => {
                      scanFrameRef.current?.measureInWindow((x, y, width, height) => {
                        scanFrameBounds.current = { x, y, w: width, h: height };
                      });
                    }}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {!isLocked ? (
          <ScannerBottomBar
            mode={scannerMode}
            isCompareMode={showCompareBanner}
            isLocked={isLocked}
            onCapturePress={() => void handlePhotoPress()}
            onCancelCompare={() => resetCompare()}
          />
        ) : (
          <View style={{ minHeight: 56 }} />
        )}
      </View>
    </View>
  );
}
