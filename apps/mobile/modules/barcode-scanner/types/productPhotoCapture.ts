export type ProductPhotoStepKey = 'front' | 'back' | 'missingPanel';
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
