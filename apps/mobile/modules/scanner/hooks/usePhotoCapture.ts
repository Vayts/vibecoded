import type { BarcodeLookupSuccessResponse } from '@acme/shared';
import * as ImagePicker from 'expo-image-picker';
import { useCallback } from 'react';
import { compressImage } from '../lib/compressImage';
import { usePhotoScanMutation } from './useScannerMutations';

/**
 * Hook for capturing a product photo, compressing it, and uploading for AI identification.
 * Returns null if the user cancels the camera.
 */
export function usePhotoCapture() {
  const photoMutation = usePhotoScanMutation();

  const capturePhoto = useCallback(async (): Promise<BarcodeLookupSuccessResponse | null> => {
    const pickerResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
      exif: false,
    });

    if (pickerResult.canceled || !pickerResult.assets[0]) return null;

    const { uri, width, height } = pickerResult.assets[0];
    const compressed = await compressImage(uri, width, height);
    return photoMutation.mutateAsync({ imageBase64: compressed.base64 });
  }, [photoMutation]);

  return { capturePhoto, isPending: photoMutation.isPending };
}
