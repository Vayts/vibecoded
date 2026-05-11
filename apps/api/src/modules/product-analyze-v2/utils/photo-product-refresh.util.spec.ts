import type { NormalizedProduct } from '@acme/shared';
import { mergePhotoProduct, shouldRefreshPhotoProduct } from './photo-product-refresh.util';

const buildProduct = (overrides: Partial<NormalizedProduct> = {}): NormalizedProduct => ({
  code: 'existing-code',
  product_name: 'Premium Whole Milk Yogurt Dahi',
  brands: 'Noga',
  image_url: null,
  ingredients_text: 'Cultured pasteurized Grade A milk and cream.',
  nutriscore_grade: null,
  categories: 'Whole milk yogurt; dahi',
  quantity: '4 lb (about 1.8 kg)',
  serving_size: null,
  ingredients: ['milk', 'cream', 'live active cultures'],
  allergens: [],
  additives: [],
  additives_count: null,
  traces: [],
  countries: [],
  category_tags: ['dairy', 'yogurt', 'dahi'],
  images: { front_url: null, ingredients_url: null, nutrition_url: null },
  nutrition: {
    energy_kcal_100g: 75,
    proteins_100g: 4.7,
    fat_100g: 3.5,
    saturated_fat_100g: 2,
    carbohydrates_100g: 7.9,
    sugars_100g: 7.6,
    fiber_100g: 0,
    salt_100g: 0,
    sodium_100g: 0,
  },
  scores: {
    nutriscore_grade: null,
    nutriscore_score: null,
    ecoscore_grade: null,
    ecoscore_score: null,
  },
  ...overrides,
});

describe('photo product refresh', () => {
  it('refreshes when fresh photo lookup brings different nutrition and ingredients', () => {
    const existing = buildProduct();
    const fresh = buildProduct({
      code: 'photo-new',
      ingredients_text: 'Cultured pasteurized Grade A milk and cream.',
      ingredients: ['milk', 'cream', 'live active cultures'],
      nutrition: {
        energy_kcal_100g: 170,
        proteins_100g: 11,
        fat_100g: 8,
        saturated_fat_100g: 5,
        carbohydrates_100g: 18,
        sugars_100g: 17,
        fiber_100g: 0,
        salt_100g: 0.3,
        sodium_100g: 135,
      },
    });

    expect(shouldRefreshPhotoProduct(existing, fresh)).toBe(true);
  });

  it('merges fresh data into the existing canonical product without losing the stable code', () => {
    const existing = buildProduct({
      code: 'stable-existing-code',
      image_url: 'https://cdn.example.com/existing.jpg',
      images: {
        front_url: 'https://cdn.example.com/existing.jpg',
        ingredients_url: null,
        nutrition_url: null,
      },
    });
    const fresh = buildProduct({
      code: 'photo-new',
      image_url: null,
      images: { front_url: null, ingredients_url: null, nutrition_url: null },
      ingredients: ['pasteurised Grade A whole milk', 'cream', 'live active bacterial cultures'],
      nutrition: {
        energy_kcal_100g: 170,
        proteins_100g: 11,
        fat_100g: 8,
        saturated_fat_100g: 5,
        carbohydrates_100g: 18,
        sugars_100g: 17,
        fiber_100g: 0,
        salt_100g: 0.3,
        sodium_100g: 135,
      },
    });

    expect(mergePhotoProduct(existing, fresh)).toEqual(
      expect.objectContaining({
        code: 'stable-existing-code',
        image_url: 'https://cdn.example.com/existing.jpg',
        ingredients: ['pasteurised Grade A whole milk', 'cream', 'live active bacterial cultures'],
        nutrition: expect.objectContaining({
          energy_kcal_100g: 170,
          proteins_100g: 11,
          fat_100g: 8,
          saturated_fat_100g: 5,
          carbohydrates_100g: 18,
          sugars_100g: 17,
          sodium_100g: 135,
          salt_100g: 0.3,
        }),
      }),
    );
  });
});

