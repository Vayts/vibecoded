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

  const resumeScanner = useCallback(() => {
    scanLockRef.current = false;
    setIsLocked(false);
    setIsScannerPaused(false);
  }, []);

  const { capturePhoto, isPending: isPhotoPending } = usePhotoCapture();

  // Shared photo capture handler — routes to compare or decision sheet based on state.
  const capturePhotoFromSheet = useCallback(async () => {
    try {
      const result = await capturePhoto();
      if (!result) { resumeScanner(); return; }

      const compareActive = useCompareStore.getState().isCompareMode;
      const first = useCompareStore.getState().firstProduct;

      if (compareActive && first) {
        // Photo is the second product — trigger comparison
        const compResult = await compareMutation.mutateAsync({
          barcode1: first.barcode,
          barcode2: result.barcode,
        });
        resetCompare();
        await SheetManager.show(SheetsEnum.ComparisonResultSheet, {
          payload: { result: compResult },
          onClose: resumeScanner,
        });
      } else {
        // Non-compare: show ProductDecisionSheet (same as barcode flow)
        const productPreview = {
          productId: result.productId ?? '',
          barcode: result.barcode,
          product_name: result.product.product_name,
          brands: result.product.brands,
          image_url: result.product.image_url,
        };
        await SheetManager.show(SheetsEnum.ProductDecisionSheet, {
          payload: { product: productPreview, onDismiss: resumeScanner },
        });
      }
    } catch (error) {
      // In compare mode, don't reset — preserve first product for retry
      if (!useCompareStore.getState().isCompareMode) {
        resetCompare();
      }
      await SheetManager.show(SheetsEnum.ScannerErrorSheet, {
        payload: {
          message: error instanceof Error ? error.message : 'Unable to identify product',
          onDismiss: resumeScanner,
          onPhotoPress: () => void capturePhotoFromSheet(),
        },
      });
    }
  }, [capturePhoto, compareMutation, resetCompare, resumeScanner]);

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
        const result = await compareMutation.mutateAsync({
          barcode1: first.barcode,
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
      const isNotFound = errorMessage.toLowerCase().includes('not found');
      await SheetManager.show(SheetsEnum.ScannerErrorSheet, {
        payload: {
          message: errorMessage,
          onDismiss: resumeScanner,
          ...(isNotFound && { onPhotoPress: () => void capturePhotoFromSheet() }),
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

  const isProcessing = isPhotoPending || compareMutation.isPending || lookupMutation.isPending;

  const statusMessage = isPhotoPending
    ? 'Identifying product\u2026'
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
