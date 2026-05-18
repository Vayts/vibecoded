import type { CameraCapturedPicture, CameraView } from 'expo-camera';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import type {
  CapturedProductPhoto,
  PackagePhotoMissingField,
  ProductPhotoStep,
} from '../types/productPhotoCapture';
import { createMissingFieldsStep, PRODUCT_PHOTO_STEPS } from '../utils/productPhotoCaptureSteps';

const SAVED_FEEDBACK_DURATION_MS = 1200;

const toCapturedPhoto = (
  step: ProductPhotoStep['key'],
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

export const useProductPhotoCaptureFlow = () => {
  const cameraRef = useRef<CameraView | null>(null);
  const savedFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedProductPhoto[]>([]);
  const [completedStepCount, setCompletedStepCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [savedStepTitle, setSavedStepTitle] = useState<string | null>(null);
  const [steps, setSteps] = useState<ProductPhotoStep[]>(PRODUCT_PHOTO_STEPS);

  const currentStep = steps[activeStepIndex] ?? steps[0];
  const totalSteps = useMemo(() => steps.length, [steps]);

  const clearSavedFeedbackTimeout = useCallback(() => {
    if (!savedFeedbackTimeoutRef.current) {
      return;
    }

    clearTimeout(savedFeedbackTimeoutRef.current);
    savedFeedbackTimeoutRef.current = null;
  }, []);

  const showSavedFeedback = useCallback(
    (stepTitle: string) => {
      clearSavedFeedbackTimeout();
      setSavedStepTitle(stepTitle);
      savedFeedbackTimeoutRef.current = setTimeout(() => {
        setSavedStepTitle(null);
        savedFeedbackTimeoutRef.current = null;
      }, SAVED_FEEDBACK_DURATION_MS);
    },
    [clearSavedFeedbackTimeout],
  );

  useEffect(() => {
    return clearSavedFeedbackTimeout;
  }, [clearSavedFeedbackTimeout]);

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

  const acceptCapturedPhoto = useCallback(
    (photo: CapturedProductPhoto): CapturedProductPhoto[] | null => {
      const nextCapturedPhotos = [...capturedPhotos, photo];

      setCapturedPhotos(nextCapturedPhotos);
      setCompletedStepCount((current) => Math.min(current + 1, totalSteps));
      showSavedFeedback(currentStep.shortTitle);

      if (activeStepIndex >= totalSteps - 1) {
        return nextCapturedPhotos;
      }

      setActiveStepIndex((current) => current + 1);
      return null;
    },
    [activeStepIndex, capturedPhotos, currentStep, showSavedFeedback, totalSteps],
  );

  const skipOptionalStep = useCallback((): CapturedProductPhoto[] | null => {
    if (!currentStep?.isOptional) {
      return null;
    }

    return capturedPhotos;
  }, [capturedPhotos, currentStep]);

  const requestMissingFieldsStep = useCallback(
    (missing: PackagePhotoMissingField[]) => {
      clearSavedFeedbackTimeout();
      setSavedStepTitle(null);
      setSteps([createMissingFieldsStep(missing)]);
      setActiveStepIndex(0);
      setCompletedStepCount(0);
    },
    [clearSavedFeedbackTimeout],
  );

  return {
    acceptCapturedPhoto,
    activeStepIndex,
    cameraRef,
    capturePhoto,
    capturedPhotos,
    completedStepCount,
    currentStep,
    errorMessage,
    isCapturing,
    requestMissingFieldsStep,
    savedStepTitle,
    skipOptionalStep,
    steps,
    totalSteps,
  };
};
