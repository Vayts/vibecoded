import { useCallback, useState } from 'react';
import { compressImage } from '../../../shared/lib/media/compressImage';

export interface CapturedCameraPhoto {
  uri: string;
  width: number;
  height: number;
}

type CaptureFromCamera = () => Promise<CapturedCameraPhoto | null>;

export function usePhotoCapture(captureFromCamera: CaptureFromCamera) {
  const [isPreparing, setIsPreparing] = useState(false);

  const captureCompressedPhoto = useCallback(async () => {
    setIsPreparing(true);

    try {
      const captured = await captureFromCamera();
      if (!captured) return null;

      const compressed = await compressImage(captured.uri, captured.width, captured.height);
      return { uploadUri: compressed.uri, localUri: captured.uri };
    } finally {
      setIsPreparing(false);
    }
  }, [captureFromCamera]);

  const captureAndCompress = useCallback(async () => {
    return captureCompressedPhoto();
  }, [captureCompressedPhoto]);

  return {
    captureAndCompress,
    isPending: isPreparing,
    isPreparing,
  };
}
