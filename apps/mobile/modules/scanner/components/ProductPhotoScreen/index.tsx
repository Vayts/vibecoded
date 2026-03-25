import { useRef, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Sparkles } from 'lucide-react-native';
import { SheetManager } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useMockScanPhotoMutation } from '../../hooks/useScannerMutations';
import { ScannerPermissionState } from '../ScannerPermissionState';

interface CaptureButtonProps {
  disabled: boolean;
  onPress: () => void;
}

function CaptureButton({ disabled, onPress }: CaptureButtonProps) {
  return (
    <TouchableOpacity
      accessibilityLabel="Take product photo"
      accessibilityRole="button"
      className={`h-20 w-20 items-center justify-center rounded-full border-[3px] border-white ${disabled ? 'opacity-40' : ''}`}
      disabled={disabled}
      onPress={onPress}
    >
      <View className="h-[68px] w-[68px] items-center justify-center rounded-full bg-white">
        <Camera color={COLORS.primary} size={28} />
      </View>
    </TouchableOpacity>
  );
}

export function ProductPhotoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const photoMutation = useMockScanPhotoMutation();
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const handleCapture = async () => {
    if (!cameraRef.current || photoMutation.isPending) {
      return;
    }

    setSubmitMessage(null);

    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      const result = await photoMutation.mutateAsync({ photoUri: picture.uri });
      await SheetManager.show(SheetsEnum.ScannerResultSheet, {
        payload: { result },
      });
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : 'Unable to capture photo');
    }
  };

  const handleMockCapture = async () => {
    if (photoMutation.isPending) {
      return;
    }

    setSubmitMessage(null);

    try {
      const result = await photoMutation.mutateAsync({ photoUri: 'mock://scanner/product-photo' });
      await SheetManager.show(SheetsEnum.ScannerResultSheet, {
        payload: { result },
      });
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : 'Unable to submit photo');
    }
  };

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <ScannerPermissionState
        title="Camera access required"
        description="Allow camera access to take a product photo. The captured image stays in a mocked frontend-only flow and opens a result sheet after submission."
        buttonLabel="Allow camera"
        onPress={() => {
          void requestPermission();
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView facing="back" ref={cameraRef} style={{ flex: 1 }} />

      <View
        pointerEvents="box-none"
        className="absolute inset-0 justify-between px-5"
        style={{ paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityLabel="Go back"
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full bg-black/50"
            onPress={() => {
              router.back();
            }}
          >
            <ArrowLeft color={COLORS.white} size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Use mock photo capture"
            accessibilityRole="button"
            className="rounded-full bg-black/50 px-4 py-3"
            onPress={() => {
              void handleMockCapture();
            }}
          >
            <Typography variant="buttonSmall" className="text-white">
              Use mock photo
            </Typography>
          </TouchableOpacity>
        </View>

        <View className="items-center">
          <View className="mb-5 rounded-full bg-black/50 px-4 py-2">
            <Typography variant="bodySecondary" className="text-center text-white">
              Frame the front of the product, then capture.
            </Typography>
          </View>
          <View className="rounded-xl bg-black/50 px-5 py-4">
            <View className="mb-2 flex-row items-center gap-2">
              <Sparkles color={COLORS.sparkle} size={18} />
              <Typography variant="sectionTitle" className="text-white">
                Product photo flow
              </Typography>
            </View>
            <Typography variant="bodySecondary" className="leading-6 text-white/80">
              After capture, a mocked mutation returns a frontend-only message that the photo was
              sent to AI.
            </Typography>
          </View>
        </View>

        <View className="items-center">
          {submitMessage ? (
            <Typography variant="bodySecondary" className="mb-4 text-center text-red-300">
              {submitMessage}
            </Typography>
          ) : null}

          <View className="flex-row items-center gap-6">
            <TouchableOpacity
              accessibilityLabel="Trigger mock photo capture"
              accessibilityRole="button"
              className="rounded-full bg-black/50 px-4 py-3"
              onPress={() => {
                void handleMockCapture();
              }}
            >
              <Typography variant="buttonSmall" className="text-white">
                Demo flow
              </Typography>
            </TouchableOpacity>

            <CaptureButton
              disabled={photoMutation.isPending}
              onPress={() => {
                void handleCapture();
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
