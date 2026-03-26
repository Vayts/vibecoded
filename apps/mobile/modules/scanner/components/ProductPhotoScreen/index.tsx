import { useRef, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { SheetManager } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../../../shared/components/BackButton';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { usePreparedPhotoForUpload } from '../../hooks/usePreparedPhotoForUpload';
import { useScanPhotoMutation } from '../../hooks/useScannerMutations';
import { useScannerResultSheetStore } from '../../stores/scannerResultSheetStore';
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
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const photoMutation = useScanPhotoMutation();
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const preparePhotoForUpload = usePreparedPhotoForUpload();
  const showPhotoLoading = useScannerResultSheetStore((state) => state.showPhotoLoading);

  const presentResult = async (
    photoUri: string,
    width?: number,
    height?: number,
    fileName?: string,
  ) => {
    showPhotoLoading(photoUri);
    void SheetManager.show(SheetsEnum.ScannerResultSheet, {
      payload: {
        previewImageUri: photoUri,
        presentationMode: 'personalOnly',
        origin: 'photo',
      },
    });

    try {
      const preparedPhoto = await preparePhotoForUpload({
        uri: photoUri,
        width,
        height,
        fileName,
      });
      const result = await photoMutation.mutateAsync({
        photoUri: preparedPhoto.uri,
        fileName: preparedPhoto.fileName,
        mimeType: preparedPhoto.mimeType,
      });
      useScannerResultSheetStore.getState().showPhotoResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to analyze photo';
      useScannerResultSheetStore.getState().showPhotoError(message);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || photoMutation.isPending) {
      return;
    }

    setSubmitMessage(null);

    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      await presentResult(picture.uri, picture.width, picture.height, 'product-photo');
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : 'Unable to capture photo');
    }
  };

  const handlePickPhoto = async () => {
    if (photoMutation.isPending) {
      return;
    }

    setSubmitMessage(null);

    try {
      const selection = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (selection.canceled || selection.assets.length === 0) {
        return;
      }

      const asset = selection.assets[0];
      await presentResult(asset.uri, asset.width, asset.height, asset.fileName ?? 'product-photo');
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : 'Unable to choose photo');
    }
  };

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <ScannerPermissionState
        title="Camera access required"
        description="Allow camera access to take a product photo and send it to the backend for product identification."
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
          <BackButton variant="dark" />

          <TouchableOpacity
            accessibilityLabel="Choose photo from library"
            accessibilityRole="button"
            className="rounded-full bg-black/50 px-4 py-3"
            onPress={() => {
              void handlePickPhoto();
            }}
          >
            <Typography variant="buttonSmall" className="text-white">
              Choose photo
            </Typography>
          </TouchableOpacity>
        </View>

        <View />

        <View className="items-center">
          {submitMessage ? (
            <Typography variant="bodySecondary" className="mb-4 text-center text-red-300">
              {submitMessage}
            </Typography>
          ) : null}

          <View className="items-center gap-4">
            <CaptureButton
              disabled={photoMutation.isPending}
              onPress={() => {
                void handleCapture();
              }}
            />

            <TouchableOpacity
              accessibilityLabel="Choose product photo"
              accessibilityRole="button"
              className="rounded-full bg-black/50 px-4 py-3"
              onPress={() => {
                void handlePickPhoto();
              }}
            >
              <Typography variant="buttonSmall" className="text-white">
                Upload photo
              </Typography>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
