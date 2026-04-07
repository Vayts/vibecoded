import type { BarcodeLookupSuccessResponse } from '@acme/shared';
import * as ImagePicker from 'expo-image-picker';
import { useCallback } from 'react';
import { compressImage } from '../lib/compressImage';
import { usePhotoScanMutation, usePhotoOcrMutation } from './useScannerMutations';

export interface PhotoPreviewResult {
  productName: string | null;
  brand: string | null;
  imageBase64: string;
  localImageUri: string;
}

/**
 * Hook for capturing a product photo, compressing it, and uploading for AI identification.
 * Returns null if the user cancels the camera.
 */
export function usePhotoCapture() {
  const photoMutation = usePhotoScanMutation();
  const ocrMutation = usePhotoOcrMutation();

  const launchCamera = useCallback(async () => {
    const pickerResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
      exif: false,
    });

    if (pickerResult.canceled || !pickerResult.assets[0]) return null;

    const { uri, width, height } = pickerResult.assets[0];
    const compressed = await compressImage(uri, width, height);
    return { base64: compressed.base64, localUri: uri };
  }, []);

  /** Full pipeline: camera → compress → identify product (for compare second product) */
  const capturePhoto = useCallback(async (): Promise<BarcodeLookupSuccessResponse | null> => {
    const captured = await launchCamera();
    if (!captured) return null;
    return photoMutation.mutateAsync({ imageBase64: captured.base64 });
  }, [launchCamera, photoMutation]);

  /** OCR-only: camera → compress → extract text (fast preview for decision sheet) */
  const capturePhotoPreview = useCallback(async (): Promise<PhotoPreviewResult | null> => {
    const captured = await launchCamera();
    if (!captured) return null;
    const ocr = await ocrMutation.mutateAsync({ imageBase64: captured.base64 });
    return {
      productName: ocr.productName,
      brand: ocr.brand,
      imageBase64: captured.base64,
      localImageUri: captured.localUri,
    };
  }, [launchCamera, ocrMutation]);

  /** Camera → compress only, returns base64 + localUri without any API call */
  const captureAndCompress = useCallback(async () => {
    return launchCamera();
  }, [launchCamera]);

  return {
    capturePhoto,
    capturePhotoPreview,
    captureAndCompress,
    isPending: photoMutation.isPending || ocrMutation.isPending,
    isOcrPending: ocrMutation.isPending,
  };
}
