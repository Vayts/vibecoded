import type { CameraView } from 'expo-camera';
import type { RefObject } from 'react';

export type ProductPhotoStepKey = 'front' | 'ingredientsNutrition' | 'extraPanel' | 'recapture';
export type PackagePhotoMissingField = 'nutritionFacts' | 'ingredients';

export interface ProductPhotoStep {
  key: ProductPhotoStepKey;
  title: string;
  shortTitle: string;
  description: string;
  helperText: string;
  captureLabel: string;
  isOptional: boolean;
}

export interface CapturedProductPhoto {
  step: ProductPhotoStepKey;
  uri: string;
  width: number;
  height: number;
}

export interface ProductPhotoCaptureFlow {
  acceptCapturedPhoto: (photo: CapturedProductPhoto) => CapturedProductPhoto[] | null;
  activeStepIndex: number;
  cameraRef: RefObject<CameraView | null>;
  capturePhoto: () => Promise<CapturedProductPhoto | null>;
  capturedPhotos: CapturedProductPhoto[];
  completedStepCount: number;
  currentStep: ProductPhotoStep;
  errorMessage: string | null;
  isCapturing: boolean;
  requestMissingFieldsStep: (missing: PackagePhotoMissingField[]) => void;
  skipOptionalStep: () => CapturedProductPhoto[] | null;
  totalSteps: number;
}
