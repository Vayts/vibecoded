import type { PackagePhotoMissingField, ProductPhotoStep } from '../types/productPhotoCapture';

export const PRODUCT_PHOTO_STEPS: ProductPhotoStep[] = [
  {
    key: 'front',
    title: 'Front of package',
    shortTitle: 'Front',
    description: 'Take a clear photo of the front label so we can read the name, brand, and flavor.',
    helperText: 'Keep the full front side visible and avoid glare over the product name.',
    captureLabel: 'Capture front',
    isOptional: false,
  },
  {
    key: 'back',
    title: 'Back of package',
    shortTitle: 'Back',
    description: 'Take a clear photo of the back side. We’ll check if it includes nutrition and ingredients.',
    helperText: 'Keep the full back side visible and make small text sharp.',
    captureLabel: 'Capture back',
    isOptional: false,
  },
];

export const createMissingPanelStep = (missing: PackagePhotoMissingField[]): ProductPhotoStep => {
  const needsBoth = missing.includes('nutritionFacts') && missing.includes('ingredients');
  const needsNutrition = missing.includes('nutritionFacts');

  if (needsBoth) {
    return {
      key: 'missingPanel',
      title: 'Nutrition facts + ingredients',
      shortTitle: 'Missing',
      description: 'We still need a readable photo of the nutrition facts and ingredients.',
      helperText: 'Find the side with the missing panels and keep the small text sharp.',
      captureLabel: 'Capture missing panels',
      isOptional: false,
    };
  }

  return {
    key: 'missingPanel',
    title: needsNutrition ? 'Nutrition facts' : 'Ingredients list',
    shortTitle: needsNutrition ? 'Nutrition' : 'Ingredients',
    description: needsNutrition
      ? 'We still need a readable photo of the nutrition facts panel.'
      : 'We still need a readable photo of the ingredients list.',
    helperText: 'Move close enough to make small text readable and avoid glare.',
    captureLabel: needsNutrition ? 'Capture nutrition' : 'Capture ingredients',
    isOptional: false,
  };
};
