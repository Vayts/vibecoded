import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
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
import { useCompareStore } from '../../stores/compareStore';
import { ScannerPermissionState } from '../ScannerPermissionState';

const SAMPLE_BARCODE = '5901234123457';
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
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const isPending = lookupMutation.isPending || compareMutation.isPending;

  const resumeScanner = useCallback(() => {
    scanLockRef.current = false;
    setIsLocked(false);
    setIsScannerPaused(false);
  }, []);

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
    setSubmitMessage(null);

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
      resetCompare();
      setSubmitMessage(error instanceof Error ? error.message : 'Unable to submit barcode');
      resumeScanner();
    }
  }, [compareMutation, lookupMutation, resetCompare, resumeScanner]);

  const handleBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
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

  const statusMessage = isPending
    ? isCompareMode
      ? 'Comparing products\u2026'
      : 'Looking up product\u2026'
    : 'Preparing next scan\u2026';

  return (
    <View className="flex-1 bg-black">
      <CameraView
        active={!isScannerPaused}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
        }}
        facing="back"
        onBarcodeScanned={isScannerPaused ? undefined : handleBarcodeScanned}
        style={{ flex: 1 }}
      />

      {isLocked ? (
        <View className="absolute inset-0 items-center justify-center bg-black/35 px-6">
          <View className="items-center rounded-xl bg-black/70 px-5 py-4">
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
              {isCompareMode ? 'Scan second barcode' : 'Align the barcode inside the frame'}
            </Typography>
          </View>
          <View className="h-64 w-full max-w-[320px] rounded-[32px] border-2 border-white/80" />
        </View>

        <View className="items-center gap-3">
          {isCompareMode ? (
            <TouchableOpacity
              accessibilityLabel="Cancel comparison"
              accessibilityRole="button"
              activeOpacity={0.7}
              className="rounded-full bg-black/50 px-4 py-3"
              onPress={() => resetCompare()}
            >
              <Typography variant="buttonSmall" className="text-white">
                Cancel comparison
              </Typography>
            </TouchableOpacity>
          ) : null}
          {submitMessage ? (
            <Typography variant="bodySecondary" className="text-center text-red-300">
              {submitMessage}
            </Typography>
          ) : null}
        </View>
      </View>
    </View>
  );
}
