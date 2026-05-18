import type { PackagePhotoMissingField, ProductPhotoStep } from '../types/productPhotoCapture';

export const PRODUCT_PHOTO_STEPS: ProductPhotoStep[] = [
  {
    key: 'front',
    title: 'Front label',
    shortTitle: 'Front',
    description: 'Photograph the front label so we can read the product name and brand.',
    helperText: 'Keep the full front side visible and avoid glare over the product name.',
    captureLabel: 'Capture front label',
    isOptional: false,
  },
  {
    key: 'ingredientsNutrition',
    title: 'Ingredients + nutrition',
    shortTitle: 'Details',
    description: 'Photograph the ingredients list and/or nutrition facts panel.',
    helperText: 'Move close enough to make small text readable and keep glare off the label.',
    captureLabel: 'Capture details',
    isOptional: false,
  },
  {
    key: 'extraPanel',
    title: 'Extra package side',
    shortTitle: 'Extra',
    description:
      'Optional: add another side if ingredients or nutrition facts are split across panels.',
    helperText: 'Use this for any extra ingredients, allergen, or nutrition information.',
    captureLabel: 'Capture extra photo',
    isOptional: true,
  },
];

export const createMissingFieldsStep = (missing: PackagePhotoMissingField[]): ProductPhotoStep => {
  const needsBoth = missing.includes('nutritionFacts') && missing.includes('ingredients');
  const needsNutrition = missing.includes('nutritionFacts');

  if (needsBoth) {
    return {
      key: 'recapture',
      title: 'Ingredients + nutrition facts',
      shortTitle: 'More details',
      description: 'Add one clear photo showing both the ingredients list and nutrition facts.',
      helperText: 'Keep the package still and make the small text sharp.',
      captureLabel: 'Capture missing details',
      isOptional: false,
    };
  }

  return {
    key: 'recapture',
    title: needsNutrition ? 'Nutrition facts' : 'Ingredients list',
    shortTitle: needsNutrition ? 'Nutrition' : 'Ingredients',
    description: needsNutrition
      ? 'Add a clear photo of the nutrition facts panel.'
      : 'Add a clear photo of the ingredients list.',
    helperText: 'Move close enough to make small text readable and avoid glare.',
    captureLabel: needsNutrition ? 'Capture nutrition' : 'Capture ingredients',
    isOptional: false,
  };
};
