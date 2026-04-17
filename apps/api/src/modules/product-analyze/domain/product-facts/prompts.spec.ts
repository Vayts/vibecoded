import type { NormalizedProduct } from '@acme/shared';
import { buildProductFactsPrompt } from './prompts';

const PRODUCT: NormalizedProduct = {
  code: '12345678',
  product_name: 'Protein Yogurt',
  brands: 'Acme',
  image_url: null,
  ingredients_text: 'Milk, strawberries, sugar',
  nutriscore_grade: 'b',
  categories: 'Dairy desserts, Yogurts',
  quantity: null,
  serving_size: null,
  ingredients: ['Milk', 'Strawberries', 'Sugar'],
  allergens: ['milk'],
  additives: [],
  additives_count: 0,
  traces: ['nuts'],
  countries: [],
  category_tags: ['en:yogurts', 'en:dairy-desserts'],
  images: {
    front_url: null,
    ingredients_url: null,
    nutrition_url: null,
  },
  nutrition: {
    energy_kcal_100g: 110,
    proteins_100g: 9,
    fat_100g: 2,
    saturated_fat_100g: 1.2,
    carbohydrates_100g: 12,
    sugars_100g: 10,
    fiber_100g: 0,
    salt_100g: 0.1,
    sodium_100g: 0.04,
  },
  scores: {
    nutriscore_grade: 'b',
    nutriscore_score: null,
    ecoscore_grade: null,
    ecoscore_score: null,
  },
};

describe('buildProductFactsPrompt', () => {
  it('keeps classification-relevant fields and omits nutrition details', () => {
    const prompt = buildProductFactsPrompt(PRODUCT);

    expect(prompt).toContain('Product: Protein Yogurt');
    expect(prompt).toContain('Brand: Acme');
    expect(prompt).toContain('Categories: Dairy desserts, Yogurts');
    expect(prompt).toContain('Ingredients: Milk, Strawberries, Sugar');
    expect(prompt).toContain('Allergens: milk');
    expect(prompt).toContain('Traces: nuts');
    expect(prompt).toContain('Nutri-Score: B');
    expect(prompt).toContain('Category tags: en:yogurts, en:dairy-desserts');
    expect(prompt).not.toContain('Nutrition per 100g:');
    expect(prompt).not.toContain('protein: 9g');
    expect(prompt).not.toContain('sugars: 10g');
  });
});
