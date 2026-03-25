import { createHash } from 'node:crypto';
import { z } from 'zod';

export const PHOTO_SOURCE = 'photo';
export const MIN_IDENTIFICATION_CONFIDENCE = 0.72;
export const MIN_RESEARCH_CONFIDENCE = 0.75;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const nullableStringSchema = z.string().nullable();
const nullableNumberSchema = z.number().nullable();

export const photoIdentificationSchema = z.object({
  isFoodProduct: z.boolean(),
  isPackagedFoodProduct: z.boolean(),
  confidence: z.number().min(0).max(1),
  visibleBarcode: z.string().nullable(),
  productName: z.string().nullable(),
  brand: z.string().nullable(),
  categoryGuess: z.string().nullable(),
  visibleText: z.array(z.string()),
  visibleIngredientsText: z.string().nullable(),
  visibleAllergensText: z.string().nullable(),
  animalProductSignals: z.array(z.string()),
  searchQuery: z.string().nullable(),
});

export const researchedProductSchema = z.object({
  confidentlyIdentified: z.boolean(),
  confidence: z.number().min(0).max(1),
  product: z.object({
    code: nullableStringSchema,
    product_name: nullableStringSchema,
    brands: nullableStringSchema,
    image_url: nullableStringSchema,
    ingredients_text: nullableStringSchema,
    nutriscore_grade: nullableStringSchema,
    categories: nullableStringSchema,
    quantity: nullableStringSchema,
    serving_size: nullableStringSchema,
    ingredients: z.array(z.string()),
    allergens: z.array(z.string()),
    additives: z.array(z.string()),
    additives_count: nullableNumberSchema,
    traces: z.array(z.string()),
    countries: z.array(z.string()),
    category_tags: z.array(z.string()),
    images: z.object({
      front_url: nullableStringSchema,
      ingredients_url: nullableStringSchema,
      nutrition_url: nullableStringSchema,
    }),
    nutrition: z.object({
      energy_kcal_100g: nullableNumberSchema,
      proteins_100g: nullableNumberSchema,
      fat_100g: nullableNumberSchema,
      saturated_fat_100g: nullableNumberSchema,
      carbohydrates_100g: nullableNumberSchema,
      sugars_100g: nullableNumberSchema,
      fiber_100g: nullableNumberSchema,
      salt_100g: nullableNumberSchema,
      sodium_100g: nullableNumberSchema,
    }),
    scores: z.object({
      nutriscore_grade: nullableStringSchema,
      nutriscore_score: nullableNumberSchema,
      ecoscore_grade: nullableStringSchema,
      ecoscore_score: nullableNumberSchema,
    }),
  }),
});

export type ResearchedProduct = z.infer<typeof researchedProductSchema>['product'];

export const getResponseText = (content: unknown): string => {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') {
        return item.text;
      }

      return '';
    })
    .join('')
    .trim();
};

export const extractJsonObject = (raw: string): unknown => {
  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Photo lookup returned invalid JSON');
  }

  return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
};

export const normalizeSyntheticCode = (product: ResearchedProduct): string => {
  const hash = createHash('sha256')
    .update(`${product.brands ?? ''}|${product.product_name ?? ''}|${product.quantity ?? ''}`)
    .digest('hex')
    .slice(0, 16);

  return `photo-${hash}`;
};

export const hasEnoughProductEvidence = (product: ResearchedProduct): boolean => {
  const hasNutrition = Object.values(product.nutrition).some((value) => value != null);

  return Boolean(
    product.product_name &&
      (product.brands || product.categories || product.ingredients_text || hasNutrition),
  );
};