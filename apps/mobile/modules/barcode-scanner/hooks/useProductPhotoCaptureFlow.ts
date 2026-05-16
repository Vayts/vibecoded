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
  const [steps, setSteps] = useState<ProductPhotoStep[]>(PRODUCT_PHOTO_STEPS);

  const currentStep = steps[activeStepIndex] ?? steps[0];
  const capturedPhotos = useMemo(
    () => toOrderedCapturedPhotos(capturedByStep, steps),
    [capturedByStep, steps],
  );

  const capturePhoto = useCallback(async (): Promise<CapturedProductPhoto | null> => {
    if (isCapturing) {
      return null;
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
        return null;
      }

      return captured;
    } catch {
      setErrorMessage('Camera is not ready yet. Please try again.');
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [currentStep, isCapturing]);

  const acceptCapturedPhoto = useCallback((photo: CapturedProductPhoto): CapturedProductPhoto[] | null => {
    const nextCapturedByStep = { ...capturedByStep, [photo.step]: photo };

    setCapturedByStep(nextCapturedByStep);

    if (activeStepIndex >= steps.length - 1) {
      return toOrderedCapturedPhotos(nextCapturedByStep, steps);
    }

    setActiveStepIndex((current) => current + 1);
    return null;
  }, [activeStepIndex, capturedByStep, steps]);

  const skipOptionalStep = useCallback((): CapturedProductPhoto[] | null => {
    if (!currentStep?.isOptional) {
      return null;
    }

    return capturedPhotos;
  }, [capturedPhotos, currentStep]);

  const requestMissingPanelStep = useCallback((missing: PackagePhotoMissingField[]) => {
    setSteps([...PRODUCT_PHOTO_STEPS, createMissingPanelStep(missing)]);
    setActiveStepIndex(PRODUCT_PHOTO_STEPS.length);
  }, []);

  return {
    acceptCapturedPhoto,
    activeStepIndex,
    cameraRef,
    capturePhoto,
    capturedPhotos,
    currentStep,
    errorMessage,
    isCapturing,
    requestMissingPanelStep,
    skipOptionalStep,
    totalSteps: steps.length,
  };
};


