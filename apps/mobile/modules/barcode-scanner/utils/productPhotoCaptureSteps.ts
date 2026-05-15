import type { ProductPhotoStep } from '../types/productPhotoCapture';

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
    key: 'nutritionIngredients',
    title: 'Nutrition facts + ingredients',
    shortTitle: 'Facts',
    description: 'Capture the nutrition facts and ingredients together if they are on the same side.',
    helperText: 'Make sure small text is sharp. Move closer if the panel is hard to read.',
    captureLabel: 'Capture facts',
    isOptional: false,
  },
  {
    key: 'extraPanel',
    title: 'Extra side if needed',
    shortTitle: 'Extra',
    description: 'Optional: add another photo only if ingredients or nutrition facts are elsewhere.',
    helperText: 'Skip this step when the previous photo already includes everything.',
    captureLabel: 'Capture extra side',
    isOptional: true,
  },
];
