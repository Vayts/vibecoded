export type ProductPhotoStepKey = 'front' | 'nutritionIngredients' | 'extraPanel';

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
