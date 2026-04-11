import type { NormalizedProduct } from '@acme/shared';
import {
  buildCanonicalProductText,
  sanitizeNormalizedProductTextFields,
  sanitizeProductText,
} from './product-canonical-text';

const PRODUCT: NormalizedProduct = {
  code: '1234567890',
  product_name: 'Chef &quot;Special&quot; Pizza',
  brands: 'Tom &amp; Co',
  image_url: null,
  ingredients_text: 'Tomatoes, &quot;mozzarella&quot;, basil',
  nutriscore_grade: 'a',
  categories: 'Meals &amp; pizzas',
  quantity: '350&nbsp;g',
  serving_size: '&quot;1/2 pizza&quot;',
  ingredients: ['Tomatoes', '&quot;Mozzarella&quot;', 'Basil &amp; oregano'],
  allergens: ['milk'],
  additives: ['e330'],
  additives_count: 1,
  traces: ['nuts &amp; seeds'],
  countries: ['United&nbsp;Kingdom'],
  category_tags: ['prepared&nbsp;meals'],
  images: {
    front_url: null,
    ingredients_url: null,
    nutrition_url: null,
  },
  nutrition: {
    energy_kcal_100g: 250,
    proteins_100g: 10,
    fat_100g: 12,
    saturated_fat_100g: 4,
    carbohydrates_100g: 24,
    sugars_100g: 3,
    fiber_100g: 2,
    salt_100g: 0.9,
    sodium_100g: 0.36,
  },
  scores: {
    nutriscore_grade: 'a',
    nutriscore_score: 1,
    ecoscore_grade: null,
    ecoscore_score: null,
  },
};

describe('sanitizeProductText', () => {
  it('decodes html entities and collapses whitespace', () => {
    expect(sanitizeProductText('  Chef &quot;Special&quot;&nbsp;Pizza  ')).toBe(
      'Chef "Special" Pizza',
    );
  });

  it('decodes nested entity escaping', () => {
    expect(sanitizeProductText('Tom &amp;quot;Jerry&amp;quot;')).toBe(
      'Tom "Jerry"',
    );
  });
});

describe('sanitizeNormalizedProductTextFields', () => {
  it('sanitizes user-facing normalized product fields', () => {
    const sanitized = sanitizeNormalizedProductTextFields(PRODUCT);

    expect(sanitized.product_name).toBe('Chef "Special" Pizza');
    expect(sanitized.brands).toBe('Tom & Co');
    expect(sanitized.ingredients_text).toBe('Tomatoes, "mozzarella", basil');
    expect(sanitized.quantity).toBe('350 g');
    expect(sanitized.serving_size).toBe('"1/2 pizza"');
    expect(sanitized.ingredients).toEqual([
      'Tomatoes',
      '"Mozzarella"',
      'Basil & oregano',
    ]);
    expect(sanitized.traces).toEqual(['nuts & seeds']);
    expect(sanitized.countries).toEqual(['United Kingdom']);
    expect(sanitized.category_tags).toEqual(['prepared meals']);
  });
});

describe('buildCanonicalProductText', () => {
  it('uses sanitized product name and brand', () => {
    expect(
      buildCanonicalProductText({
        productName: 'Chef &quot;Special&quot; Pizza',
        brand: 'Tom &amp; Co',
      }),
    ).toBe('chef "special" pizza tom & co');
  });
});