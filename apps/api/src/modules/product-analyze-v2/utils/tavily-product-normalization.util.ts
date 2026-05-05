import { normalizedProductSchema, type NormalizedProduct } from '@acme/shared';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { withCanonicalProductImage } from '../../../shared/utils/product-image.js';

type NutritionKey =
  | 'energy_kcal_100g'
  | 'proteins_100g'
  | 'fat_100g'
  | 'saturated_fat_100g'
  | 'carbohydrates_100g'
  | 'sugars_100g'
  | 'fiber_100g'
  | 'salt_100g'
  | 'sodium_100g';

const PER_100G_MAX: Record<NutritionKey, number> = {
  energy_kcal_100g: 900,
  proteins_100g: 100,
  fat_100g: 100,
  saturated_fat_100g: 100,
  carbohydrates_100g: 100,
  sugars_100g: 100,
  fiber_100g: 100,
  salt_100g: 100,
  sodium_100g: 40,
};

export const tavilyStructuredProductV2Schema = z.object({
  found: z.boolean(),
  confidence: z.number().min(0).max(1),
  product: z
    .object({
      product_name: z.string().nullable(),
      brands: z.string().nullable(),
      ingredients_text: z.string().nullable(),
      ingredients: z.array(z.string()),
      nutriscore_grade: z.string().nullable(),
      categories: z.string().nullable(),
      quantity: z.string().nullable(),
      serving_size: z.string().nullable(),
      allergens: z.array(z.string()).default([]),
      additives: z.array(z.string()).default([]),
      traces: z.array(z.string()).default([]),
      countries: z.array(z.string()).default([]),
      category_tags: z.array(z.string()).default([]),
      nutrition: z.object({
        energy_kcal_100g: z.number().nullable(),
        proteins_100g: z.number().nullable(),
        fat_100g: z.number().nullable(),
        saturated_fat_100g: z.number().nullable(),
        carbohydrates_100g: z.number().nullable(),
        sugars_100g: z.number().nullable(),
        fiber_100g: z.number().nullable(),
        salt_100g: z.number().nullable(),
        sodium_100g: z.number().nullable(),
      }),
    })
    .nullable(),
});

export type TavilyStructuredProductV2 = z.infer<typeof tavilyStructuredProductV2Schema>;

export const TAVILY_PRODUCT_NORMALIZATION_PROMPT_V2 = `You normalize food product nutrition from Tavily search results.

Important rules:
- Use only Tavily search snippets/content and OCR hints provided by the user.
- Do not invent facts. If data is unreliable or contradictory, return found=false.
- Match the exact product variant from the OCR hints.
- Return nutrition per 100g, or per 100ml for liquids, only.
- Convert per-serving or per-kg values to per 100g when the source gives enough information.
- Round calories to the nearest integer and other numeric values to 1 decimal place.
- Missing nutrition values must be null, never zero placeholders.
- Extract ingredients only when explicitly available.
- Product name must be the short product name without brand; brands must contain brand/manufacturer only.
- Return allergens/additives/traces only when explicitly available from source text.`;

export const truncateTavilyTextV2 = (value: string | undefined, maxLength: number): string =>
  value && value.length > maxLength ? `${value.slice(0, maxLength)}…` : (value ?? '');

const roundTo1 = (value: number | null | undefined): number | null =>
  value != null ? Math.round(value * 10) / 10 : null;

const sanitizeList = (values: string[]): string[] =>
  values.map((value) => value.trim()).filter((value) => value.length > 0);

const hasMeaningfulNutrition = (product: NormalizedProduct): boolean => {
  const n = product.nutrition;
  return Boolean(
    (n.energy_kcal_100g != null && n.energy_kcal_100g > 0) ||
    (n.proteins_100g != null && n.proteins_100g > 0) ||
    (n.fat_100g != null && n.fat_100g > 0) ||
    (n.carbohydrates_100g != null && n.carbohydrates_100g > 0),
  );
};

const sanitizeNutritionValues = (
  raw: Record<NutritionKey, number | null>,
): Record<NutritionKey, number | null> => {
  const keys = Object.keys(PER_100G_MAX) as NutritionKey[];
  const overCount = keys.reduce(
    (count, key) => (raw[key] != null && raw[key] > PER_100G_MAX[key] ? count + 1 : count),
    0,
  );

  return Object.fromEntries(
    keys.map((key) => {
      const value = raw[key];
      if (value == null) return [key, null];
      if (overCount >= 3) return [key, value / 10];
      return [key, value > PER_100G_MAX[key] ? null : value];
    }),
  ) as Record<NutritionKey, number | null>;
};

export const normalizeTavilyProductResultV2 = (input: {
  result: TavilyStructuredProductV2;
  productName: string | null;
  brand: string | null;
}): NormalizedProduct | null => {
  if (!input.result.product) return null;

  const product = input.result.product;
  const saneNutrition = sanitizeNutritionValues(product.nutrition);
  const parsed = normalizedProductSchema.safeParse({
    code: `photo-${randomUUID().slice(0, 12)}`,
    product_name: product.product_name ?? input.productName,
    brands: product.brands ?? input.brand,
    image_url: null,
    ingredients_text: product.ingredients_text,
    nutriscore_grade: product.nutriscore_grade,
    categories: product.categories,
    quantity: product.quantity,
    serving_size: product.serving_size,
    ingredients: sanitizeList(product.ingredients),
    allergens: sanitizeList(product.allergens),
    additives: sanitizeList(product.additives),
    additives_count: null,
    traces: sanitizeList(product.traces),
    countries: sanitizeList(product.countries),
    category_tags: sanitizeList(product.category_tags),
    images: { front_url: null, ingredients_url: null, nutrition_url: null },
    nutrition: {
      energy_kcal_100g:
        saneNutrition.energy_kcal_100g != null ? Math.round(saneNutrition.energy_kcal_100g) : null,
      proteins_100g: roundTo1(saneNutrition.proteins_100g),
      fat_100g: roundTo1(saneNutrition.fat_100g),
      saturated_fat_100g: roundTo1(saneNutrition.saturated_fat_100g),
      carbohydrates_100g: roundTo1(saneNutrition.carbohydrates_100g),
      sugars_100g: roundTo1(saneNutrition.sugars_100g),
      fiber_100g: roundTo1(saneNutrition.fiber_100g),
      salt_100g: roundTo1(saneNutrition.salt_100g),
      sodium_100g: roundTo1(saneNutrition.sodium_100g),
    },
    scores: {
      nutriscore_grade: product.nutriscore_grade,
      nutriscore_score: null,
      ecoscore_grade: null,
      ecoscore_score: null,
    },
  });

  return parsed.success && hasMeaningfulNutrition(parsed.data)
    ? withCanonicalProductImage(parsed.data)
    : null;
};
