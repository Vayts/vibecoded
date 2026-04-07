import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../../../shared/components/BackButton';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { SheetsEnum } from '../../../../shared/types/sheets';
import {
  useProductLookupMutation,
  useCompareProductsMutation,
} from '../../hooks/useScannerMutations';
import { usePhotoCapture } from '../../hooks/usePhotoCapture';
import { ScannerApiError, submitPhotoScan } from '../../api/scannerMutations';
import { useCompareStore } from '../../stores/compareStore';
import { ScannerBottomBar } from './ScannerBottomBar';
import { ScannerPermissionState } from '../ScannerPermissionState';

const RESCAN_COOLDOWN_MS = 1500;

export function ScannerHomeScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const lookupMutation = useProductLookupMutation();
  const compareMutation = useCompareProductsMutation();

  const isCompareMode = useCompareStore((s) => s.isCompareMode);
  const firstProduct = useCompareStore((s) => s.firstProduct);
  const resetCompare = useCompareStore((s) => s.reset);

  const scanLockRef = useRef(false);
  const lastScanRef = useRef<{ barcode: string; timestamp: number } | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isScannerPaused, setIsScannerPaused] = useState(false);
  const scanFrameRef = useRef<View>(null);
  const scanFrameBounds = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isResolvingFirstProduct, setIsResolvingFirstProduct] = useState(false);

  const resumeScanner = useCallback(() => {
    scanLockRef.current = false;
    setIsLocked(false);
    setIsScannerPaused(false);
    setIsResolvingFirstProduct(false);
  }, []);

  const { captureAndCompress, capturePhotoPreview, isPending: isPhotoPending } = usePhotoCapture();

  // Shared photo capture handler — routes to compare or decision sheet based on state.
  const capturePhotoFromSheet = useCallback(async () => {
    try {
      const compareActive = useCompareStore.getState().isCompareMode;
      const first = useCompareStore.getState().firstProduct;

      if (compareActive && first) {
        const firstPhotoUri = useCompareStore.getState().firstProductPhotoUri;
        const firstProductOcr = useCompareStore.getState().firstProductOcr;

        // Second product in compare mode — capture photo, then resolve both in parallel
        const captured = await captureAndCompress();
        if (!captured) { resumeScanner(); return; }

        setIsResolvingFirstProduct(true);
        const [firstResolved, secondResolved] = await Promise.all([
          firstPhotoUri
            ? submitPhotoScan({ photoUri: firstPhotoUri, ocr: firstProductOcr ?? undefined })
            : Promise.resolve({ barcode: first.barcode }),
          submitPhotoScan({ photoUri: captured.uploadUri }),
        ]);
        setIsResolvingFirstProduct(false);

        const compResult = await compareMutation.mutateAsync({
          barcode1: firstResolved.barcode,
          barcode2: secondResolved.barcode,
        });
        resetCompare();
        await SheetManager.show(SheetsEnum.ComparisonResultSheet, {
          payload: { result: compResult },
          onClose: resumeScanner,
        });
      } else {
        // First product — OCR preview only (fast), full analysis deferred to user action
        const preview = await capturePhotoPreview();
        if (!preview) { resumeScanner(); return; }
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
      }
    } catch (error) {
      // In compare mode, don't reset — preserve first product for retry
      if (!useCompareStore.getState().isCompareMode) {
        resetCompare();
      }
      const errorMessage = error instanceof Error ? error.message : 'Unable to identify product';
      const errorCode = error instanceof ScannerApiError ? error.code : undefined;
      const isRetriableNotFound = errorCode === 'PRODUCT_NOT_FOUND';
      await SheetManager.show(SheetsEnum.ScannerErrorSheet, {
        payload: {
          variant: errorCode === 'NOT_FOOD' ? 'not-food' : isRetriableNotFound ? 'not-found' : 'generic',
          title: errorCode === 'NOT_FOOD' ? 'This is not a food product' : undefined,
          message:
            errorCode === 'NOT_FOOD'
              ? 'The photo does not appear to show a food or drink product. Please scan a food item instead.'
              : errorMessage,
          onDismiss: resumeScanner,
          onPhotoPress: isRetriableNotFound ? () => void capturePhotoFromSheet() : undefined,
        },
      });
    }
  }, [captureAndCompress, capturePhotoPreview, compareMutation, resetCompare, resumeScanner]);

  const handlePhotoPress = useCallback(async () => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setIsLocked(true);
    setIsScannerPaused(true);
    await capturePhotoFromSheet();
  }, [capturePhotoFromSheet]);

  const submitBarcode = useCallback(async (barcode: string) => {
    const normalized = barcode.trim();
    if (!normalized || scanLockRef.current) return;

    const now = Date.now();
    const prev = lastScanRef.current;
    if (prev && prev.barcode === normalized && now - prev.timestamp < RESCAN_COOLDOWN_MS) return;

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
          const firstResolved = await submitPhotoScan({ photoUri: firstPhotoUri, ocr: firstProductOcr ?? undefined });
          setIsResolvingFirstProduct(false);
          barcode1 = firstResolved.barcode;
        } else {
          barcode1 = first.barcode;
        }

        const result = await compareMutation.mutateAsync({
          barcode1,
          barcode2: normalized,
        });
        resetCompare();
        await SheetManager.show(SheetsEnum.ComparisonResultSheet, {
          payload: { result },
          onClose: resumeScanner,
        });
      } else {
        const lookupResult = await lookupMutation.mutateAsync({ barcode: normalized });
        // Decision sheet: onClose only resumes if user dismisses without acting.
        // "Analyze" action hides the sheet then opens ScannerResultSheet,
        // so we pass resumeScanner down via payload for the final sheet to call.
        await SheetManager.show(SheetsEnum.ProductDecisionSheet, {
          payload: { product: lookupResult.product, onDismiss: resumeScanner },
        });
      }
    } catch (error) {
      // Only reset compare if NOT in compare mode (avoid losing first product on retry)
      if (!useCompareStore.getState().isCompareMode) {
        resetCompare();
      }
      const errorMessage = error instanceof Error ? error.message : 'Unable to submit barcode';
      const errorCode = error instanceof ScannerApiError ? error.code : undefined;
      const isNotFound =
        errorCode === 'PRODUCT_NOT_FOUND' || errorMessage.toLowerCase().includes('not found');
      await SheetManager.show(SheetsEnum.ScannerErrorSheet, {
        payload: {
          variant: errorCode === 'NOT_FOOD' ? 'not-food' : isNotFound ? 'not-found' : 'generic',
          title: errorCode === 'NOT_FOOD' ? 'This is not a food product' : undefined,
          message:
            errorCode === 'NOT_FOOD'
              ? 'The photo does not appear to show a food or drink product. Please scan a food item instead.'
              : errorMessage,
          onDismiss: resumeScanner,
          onPhotoPress: isNotFound ? () => void capturePhotoFromSheet() : undefined,
        },
      });
    }
  }, [capturePhotoFromSheet, compareMutation, lookupMutation, resetCompare, resumeScanner]);

  const handleBarcodeScanned = async ({ data, bounds }: BarcodeScanningResult) => {
    // On Android, barcode bounds use a different coordinate space than measureInWindow,
    // so frame-filtering only works reliably on iOS.
    if (Platform.OS === 'ios' && bounds && scanFrameBounds.current) {
      const frame = scanFrameBounds.current;
      const centerX = bounds.origin.x + bounds.size.width / 2;
      const centerY = bounds.origin.y + bounds.size.height / 2;
      const inFrame =
        centerX >= frame.x &&
        centerX <= frame.x + frame.w &&
        centerY >= frame.y &&
        centerY <= frame.y + frame.h;
      if (!inFrame) return;
    }
    await submitBarcode(data);
  };

  if (!permission) return <View className="flex-1 bg-black" />;

  if (!permission.granted) {
    return (
      <ScannerPermissionState
        title="Camera access required"
        description="Allow camera access to scan barcodes and analyze products."
        buttonLabel="Allow camera"
        onPress={() => {
          void requestPermission();
        }}
      />
    );
  }

  const isProcessing =
    isPhotoPending ||
    compareMutation.isPending ||
    lookupMutation.isPending ||
    isResolvingFirstProduct;

  const statusMessage = isPhotoPending
    ? 'Identifying product\u2026'
    : isResolvingFirstProduct
      ? 'Identifying products\u2026'
      : compareMutation.isPending
          ? 'Comparing products\u2026'
          : lookupMutation.isPending
            ? 'Looking up product\u2026'
            : 'Processing\u2026';

  return (
    <View className="flex-1 bg-black">
      <CameraView
        active={!isScannerPaused}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
        }}
        facing="back"
        onBarcodeScanned={isScannerPaused ? undefined : handleBarcodeScanned}
        style={{ flex: 1, opacity: isScannerPaused ? 0 : 1 }}
      />

      {isLocked && isProcessing ? (
        <View className="absolute inset-0 items-center justify-center px-6">
          <View className="items-center rounded-xl bg-white/10 px-5 py-4">
            <ActivityIndicator color={COLORS.white} />
            <Typography variant="bodySecondary" className="mt-3 text-center text-white">
              {statusMessage}
            </Typography>
          </View>
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        className="absolute inset-0 justify-between px-5"
        style={{ paddingTop: insets.top + 12, paddingBottom: 24 }}
      >
        <View className="flex-row items-center justify-between">
          <BackButton variant="dark" icon="close" accessibilityLabel="Close scanner" />
        </View>

        {!isLocked ? (
          <View className="items-center">
            {isCompareMode && firstProduct ? (
              <View className="mb-3 rounded-full bg-blue-600/80 px-4 py-2">
                <Typography variant="bodySecondary" className="text-center text-white">
                  Scan the second product to compare
                </Typography>
              </View>
            ) : null}

            <View className="mb-5 rounded-full bg-black/50 px-4 py-2">
              <Typography variant="bodySecondary" className="text-center text-white">
                {isCompareMode
                  ? 'Scan or photograph the second product'
                  : 'Align the barcode inside the frame'}
              </Typography>
            </View>
            <View
              ref={scanFrameRef}
              className="h-64 w-full max-w-[320px] rounded-[32px] border-2 border-white/80"
              onLayout={() => {
                scanFrameRef.current?.measureInWindow((x, y, width, height) => {
                  scanFrameBounds.current = { x, y, w: width, h: height };
                });
              }}
            />
          </View>
        ) : <View />}

        {!isLocked ? (
          <ScannerBottomBar
            isCompareMode={isCompareMode}
            isLocked={isLocked}
            onPhotoPress={() => void handlePhotoPress()}
            onCancelCompare={() => resetCompare()}
          />
        ) : <View />}
      </View>
    </View>
  );
}
