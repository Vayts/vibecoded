import type { BarcodeLookupSuccessResponse } from '@acme/shared';
import * as ImagePicker from 'expo-image-picker';
import { useCallback } from 'react';
import { compressImage } from '../../../shared/lib/media/compressImage';
import { usePhotoScanMutation, usePhotoOcrMutation } from './useScannerMutations';
import type { PhotoOcrData } from '../types/scanner';

export interface PhotoPreviewResult {
  productName: string | null;
  brand: string | null;
  photoUri: string;
  localImageUri: string;
  ocr: PhotoOcrData;
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
    return { uploadUri: compressed.uri, localUri: uri };
  }, []);

  /** Full pipeline: camera → compress → identify product (for compare second product) */
  const capturePhoto = useCallback(async (): Promise<BarcodeLookupSuccessResponse | null> => {
    const captured = await launchCamera();
    if (!captured) return null;
    return photoMutation.mutateAsync({ photoUri: captured.uploadUri });
  }, [launchCamera, photoMutation]);

  /** OCR-only: camera → compress → extract text (fast preview for decision sheet) */
  const capturePhotoPreview = useCallback(async (): Promise<PhotoPreviewResult | null> => {
    const captured = await launchCamera();
    if (!captured) return null;
    const ocr = await ocrMutation.mutateAsync({ photoUri: captured.uploadUri });
    return {
      productName: ocr.productName,
      brand: ocr.brand,
      photoUri: captured.uploadUri,
      localImageUri: captured.localUri,
      ocr,
    };
  }, [launchCamera, ocrMutation]);

  /** Camera → compress only, returns upload URI + local preview URI without any API call */
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
