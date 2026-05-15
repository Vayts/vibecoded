import type { CameraCapturedPicture, CameraView } from 'expo-camera';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import type {
  CapturedProductPhoto,
  PackagePhotoMissingField,
  ProductPhotoStep,
  ProductPhotoStepKey,
} from '../types/productPhotoCapture';
import { createMissingPanelStep, PRODUCT_PHOTO_STEPS } from '../utils/productPhotoCaptureSteps';

type ProductPhotoCaptureMode = 'camera' | 'preview';

const isCapturedPhoto = (
  photo: CapturedProductPhoto | undefined,
): photo is CapturedProductPhoto => Boolean(photo);

const toCapturedPhoto = (
  step: ProductPhotoStepKey,
  picture: CameraCapturedPicture,
): CapturedProductPhoto | null => {
  if (!picture.uri || picture.width == null || picture.height == null) {
    return null;
  }

  return {
    step,
    uri: picture.uri,
    width: picture.width,
    height: picture.height,
  };
};

const toOrderedCapturedPhotos = (
  photosByStep: Partial<Record<ProductPhotoStepKey, CapturedProductPhoto>>,
  steps: ProductPhotoStep[],
): CapturedProductPhoto[] => {
  return steps.map((step) => photosByStep[step.key]).filter(isCapturedPhoto);
};

export const useProductPhotoCaptureFlow = () => {
  const cameraRef = useRef<CameraView | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [capturedByStep, setCapturedByStep] = useState<Partial<Record<ProductPhotoStepKey, CapturedProductPhoto>>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [mode, setMode] = useState<ProductPhotoCaptureMode>('camera');
  const [pendingPhoto, setPendingPhoto] = useState<CapturedProductPhoto | null>(null);
  const [steps, setSteps] = useState<ProductPhotoStep[]>(PRODUCT_PHOTO_STEPS);

  const currentStep = steps[activeStepIndex] ?? steps[0];
  const capturedPhotos = useMemo(
    () => toOrderedCapturedPhotos(capturedByStep, steps),
    [capturedByStep, steps],
  );

  const capturePhoto = useCallback(async () => {
    if (isCapturing) {
      return;
    }

    setErrorMessage(null);
    setIsCapturing(true);
    Vibration.vibrate(35);

    try {
      const picture = await cameraRef.current?.takePictureAsync({
        exif: false,
        quality: 1,
        shutterSound: false,
      });
      const captured = picture ? toCapturedPhoto(currentStep.key, picture) : null;

      if (!captured) {
        setErrorMessage('Could not capture the photo. Please try again.');
        return;
      }

      setPendingPhoto(captured);
      setMode('preview');
    } catch {
      setErrorMessage('Camera is not ready yet. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }, [currentStep, isCapturing]);

  const acceptPendingPhoto = useCallback((): CapturedProductPhoto[] | null => {
    if (!pendingPhoto) {
      return null;
    }

    const nextCapturedByStep = { ...capturedByStep, [pendingPhoto.step]: pendingPhoto };

    setCapturedByStep(nextCapturedByStep);

    if (activeStepIndex >= steps.length - 1) {
      return toOrderedCapturedPhotos(nextCapturedByStep, steps);
    }

    setPendingPhoto(null);
    setActiveStepIndex((current) => current + 1);
    setMode('camera');
    return null;
  }, [activeStepIndex, capturedByStep, pendingPhoto, steps]);

  const retakePendingPhoto = useCallback(() => {
    if (pendingPhoto) {
      setCapturedByStep((current) => {
        const next = { ...current };
        delete next[pendingPhoto.step];
        return next;
      });
    }

    setPendingPhoto(null);
    setMode('camera');
  }, [pendingPhoto]);

  const skipOptionalStep = useCallback((): CapturedProductPhoto[] | null => {
    if (!currentStep?.isOptional) {
      return null;
    }

    setPendingPhoto(null);
    return capturedPhotos;
  }, [capturedPhotos, currentStep]);

  const requestMissingPanelStep = useCallback((missing: PackagePhotoMissingField[]) => {
    setSteps([...PRODUCT_PHOTO_STEPS, createMissingPanelStep(missing)]);
    setPendingPhoto(null);
    setActiveStepIndex(PRODUCT_PHOTO_STEPS.length);
    setMode('camera');
  }, []);

  return {
    acceptPendingPhoto,
    activeStepIndex,
    cameraRef,
    capturePhoto,
    capturedPhotos,
    currentStep,
    errorMessage,
    isCapturing,
    mode,
    pendingPhoto,
    requestMissingPanelStep,
    retakePendingPhoto,
    skipOptionalStep,
    totalSteps: steps.length,
  };
};


