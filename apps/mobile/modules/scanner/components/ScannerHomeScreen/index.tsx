import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../../../shared/components/BackButton';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useScanBarcodeMutation } from '../../hooks/useScannerMutations';
import { ScannerPermissionState } from '../ScannerPermissionState';

const SAMPLE_BARCODE = '5901234123457';
const RESCAN_COOLDOWN_MS = 1500;

export function ScannerHomeScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const barcodeMutation = useScanBarcodeMutation();

  const scanLockRef = useRef(false);
  const lastScanRef = useRef<{ barcode: string; timestamp: number } | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isScannerPaused, setIsScannerPaused] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const submitBarcode = async (barcode: string) => {
    const normalized = barcode.trim();
    if (!normalized || scanLockRef.current || barcodeMutation.isPending) return;

    const now = Date.now();
    const prev = lastScanRef.current;
    if (prev && prev.barcode === normalized && now - prev.timestamp < RESCAN_COOLDOWN_MS) return;

    scanLockRef.current = true;
    lastScanRef.current = { barcode: normalized, timestamp: now };
    setIsLocked(true);
    setIsScannerPaused(true);
    setSubmitMessage(null);

    try {
      const result = await barcodeMutation.mutateAsync({ barcode: normalized });
      await SheetManager.show(SheetsEnum.ScannerResultSheet, { payload: { result } });
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : 'Unable to submit barcode');
    } finally {
      scanLockRef.current = false;
      setIsLocked(false);
      setIsScannerPaused(false);
    }
  };

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
              {barcodeMutation.isPending ? 'Processing barcode\u2026' : 'Preparing next scan\u2026'}
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

          <TouchableOpacity
            accessibilityLabel="Use sample barcode"
            accessibilityRole="button"
            activeOpacity={0.7}
            className="rounded-full bg-black/50 px-4 py-3"
            onPress={() => {
              void submitBarcode(SAMPLE_BARCODE);
            }}
          >
            <Typography variant="buttonSmall" className="text-white">
              Use sample code
            </Typography>
          </TouchableOpacity>
        </View>

        <View className="items-center">
          <View className="mb-5 rounded-full bg-black/50 px-4 py-2">
            <Typography variant="bodySecondary" className="text-center text-white">
              Align the barcode inside the frame
            </Typography>
          </View>
          <View className="h-64 w-full max-w-[320px] rounded-[32px] border-2 border-white/80" />
        </View>

        <View className="items-center gap-3">
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
