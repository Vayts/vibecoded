import type { BarcodeLookupSuccessResponse } from '@acme/shared';
import { useCallback } from 'react';
import { compressImage } from '../../../shared/lib/media/compressImage';
import { usePhotoScanMutation, usePhotoOcrMutation } from './useScannerMutations';
import type { PhotoOcrData } from '../types/scanner';

export interface CapturedCameraPhoto {
  uri: string;
  width: number;
  height: number;
}

type CaptureFromCamera = () => Promise<CapturedCameraPhoto | null>;

export interface PhotoPreviewResult {
  productName: string | null;
  brand: string | null;
  photoUri: string;
  localImageUri: string;
  ocr: PhotoOcrData;
}

/**
 * Hook for capturing a product photo from the in-app camera,
 * compressing it, and uploading for identification.
 */
export function usePhotoCapture(captureFromCamera: CaptureFromCamera) {
  const photoMutation = usePhotoScanMutation();
  const ocrMutation = usePhotoOcrMutation();

  const captureCompressedPhoto = useCallback(async () => {
    const captured = await captureFromCamera();
    if (!captured) return null;

    const compressed = await compressImage(captured.uri, captured.width, captured.height);
    return { uploadUri: compressed.uri, localUri: captured.uri };
  }, [captureFromCamera]);

  /** Full pipeline: camera → compress → identify product (for compare second product) */
  const capturePhoto = useCallback(async (): Promise<BarcodeLookupSuccessResponse | null> => {
    const captured = await captureCompressedPhoto();
    if (!captured) return null;
    return photoMutation.mutateAsync({ photoUri: captured.uploadUri });
  }, [captureCompressedPhoto, photoMutation]);

  /** OCR-only: camera → compress → extract text (fast preview for decision sheet) */
  const capturePhotoPreview = useCallback(async (): Promise<PhotoPreviewResult | null> => {
    const captured = await captureCompressedPhoto();
    if (!captured) return null;
    const ocr = await ocrMutation.mutateAsync({ photoUri: captured.uploadUri });
    return {
      productName: ocr.productName,
      brand: ocr.brand,
      photoUri: captured.uploadUri,
      localImageUri: captured.localUri,
      ocr,
    };
  }, [captureCompressedPhoto, ocrMutation]);

  /** Camera → compress only, returns upload URI + local preview URI without any API call */
  const captureAndCompress = useCallback(async () => {
    return captureCompressedPhoto();
  }, [captureCompressedPhoto]);

  return {
    capturePhoto,
    capturePhotoPreview,
    captureAndCompress,
    isPending: photoMutation.isPending || ocrMutation.isPending,
    isOcrPending: ocrMutation.isPending,
  };
}
