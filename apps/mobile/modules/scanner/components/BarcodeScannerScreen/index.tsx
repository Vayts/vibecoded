import { useRef, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { ScanBarcode } from 'lucide-react-native';
import { SheetManager } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../../../shared/components/BackButton';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useScanBarcodeMutation } from '../../hooks/useScannerMutations';
import { ScannerPermissionState } from '../ScannerPermissionState';

const SAMPLE_BARCODE = '5901234123457';
const RESCAN_COOLDOWN_MS = 1500;

export function BarcodeScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const barcodeMutation = useScanBarcodeMutation();
  const scanLockRef = useRef(false);
  const lastScanRef = useRef<{ barcode: string; timestamp: number } | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isScannerPaused, setIsScannerPaused] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const submitBarcode = async (barcode: string) => {
    const normalizedBarcode = barcode.trim();

    if (!normalizedBarcode || scanLockRef.current || barcodeMutation.isPending) {
      return;
    }

    const now = Date.now();
    const previousScan = lastScanRef.current;

    if (
      previousScan &&
      previousScan.barcode === normalizedBarcode &&
      now - previousScan.timestamp < RESCAN_COOLDOWN_MS
    ) {
      return;
    }

    scanLockRef.current = true;
    lastScanRef.current = {
      barcode: normalizedBarcode,
      timestamp: now,
    };
    setIsLocked(true);
    setIsScannerPaused(true);
    setSubmitMessage(null);

    try {
      const result = await barcodeMutation.mutateAsync({ barcode: normalizedBarcode });
      await SheetManager.show(SheetsEnum.ScannerResultSheet, {
        payload: { result },
      });
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

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <ScannerPermissionState
        title="Camera access required"
        description="Allow camera access to scan a barcode. This flow stays frontend-only and uses a mocked async submission after detection."
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
              {barcodeMutation.isPending ? 'Processing barcode...' : 'Preparing next scan...'}
            </Typography>
          </View>
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        className="absolute inset-0 justify-between px-5"
        style={{ paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <View className="flex-row items-center justify-between">
          <BackButton variant="dark" />

          <TouchableOpacity
            accessibilityLabel="Use sample barcode"
            accessibilityRole="button"
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
              Align the barcode inside the frame.
            </Typography>
          </View>
          <View className="h-64 w-full max-w-[320px] rounded-[32px] border-2 border-white/80" />
          <View className="mt-6 rounded-xl bg-black/50 px-5 py-4">
            <View className="mb-2 flex-row items-center gap-2">
              <ScanBarcode color={COLORS.white} size={18} />
              <Typography variant="sectionTitle" className="text-white">
                Barcode scanner
              </Typography>
            </View>
            <Typography variant="bodySecondary" className="leading-6 text-white/80">
              Detected codes are sent to the backend, then shown in the result sheet as JSON.
            </Typography>
          </View>
        </View>

        <View className="gap-3">
          {submitMessage ? (
            <Typography variant="bodySecondary" className="text-center text-red-300">
              {submitMessage}
            </Typography>
          ) : null}
          <Button
            fullWidth
            label={barcodeMutation.isPending ? 'Submitting barcode...' : 'Trigger sample scan'}
            loading={barcodeMutation.isPending}
            onPress={() => {
              void submitBarcode(SAMPLE_BARCODE);
            }}
          />
        </View>
      </View>
    </View>
  );
}
