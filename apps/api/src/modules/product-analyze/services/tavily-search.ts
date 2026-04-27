import { ChatOpenAI } from '@langchain/openai';
import { normalizedProductSchema, type NormalizedProduct } from '@acme/shared';
import { tavily } from '@tavily/core';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { AI_MODELS } from '../constants/models';
import { withCanonicalProductImage } from '../../../shared/utils/product-image';

export type PhotoProductSearchProvider = 'websearch' | 'tavily';

export const PHOTO_PRODUCT_SEARCH_PROVIDER_ENV = 'PHOTO_PRODUCT_SEARCH_PROVIDER';

const DEFAULT_PHOTO_PRODUCT_SEARCH_PROVIDER: PhotoProductSearchProvider = 'websearch';

const tavilyStructuredProductSchema = z.object({
  found: z.boolean(),
  confidence: z.number().min(0).max(1),
  source: z.string().nullable(),
  product: z
    .object({
      product_name: z.string().nullable(),
      brands: z.string().nullable(),
      ingredients_text: z.string().nullable(),
      ingredients: z.array(z.string()),
      nutriscore_grade: z.string().nullable(),
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

type TavilyLookupInput = {
  allText: string;
  productName: string | null;
  brand: string | null;
};

const MIN_CONFIDENCE = 0.5;

const TAVILY_SYSTEM_PROMPT = `You normalize food product nutrition from Tavily search results.

IMPORTANT:
- Use ONLY the Tavily search snippets and OCR hints provided by the user.
- Do NOT invent facts. If the data is unreliable or contradictory, return found=false.
- Focus on the exact product variant matching the OCR hints.
- Return nutrition per 100g (or per 100ml for liquids) only.
- If the source gives per serving or per kg values, convert them to per 100g.
- Round calories to the nearest integer and all other numeric values to 1 decimal place.
- If a nutrition value is missing, return null.
- Extract ingredients when explicitly available in Tavily results.
- ingredients_text should be a readable comma-separated ingredients line in English when reliable; otherwise null.
- ingredients should be a clean array of individual ingredient names in English. If unavailable, return an empty array.
- nutriscore_grade must be a single lowercase letter when explicitly available; otherwise null.
- product_name must be the short product name without the brand.
- brands must contain the brand/manufacturer only.`;

const roundTo1 = (value: number | null | undefined): number | null =>
  value != null ? Math.round(value * 10) / 10 : null;

const PER_100G_MAX: Record<string, number> = {
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

const sanitizeNutritionValues = (
  raw: Record<string, number | null>,
): Record<string, number | null> => {
  const keys = Object.keys(PER_100G_MAX);
  const overCount = keys.reduce((count, key) => {
    const value = raw[key];
    return value != null && value > (PER_100G_MAX[key] ?? Infinity) ? count + 1 : count;
  }, 0);

  if (overCount >= 3) {
    return Object.fromEntries(keys.map((key) => [key, raw[key] != null ? raw[key] / 10 : null]));
  }

  return Object.fromEntries(
    keys.map((key) => {
      const value = raw[key];
      return [key, value != null && value > (PER_100G_MAX[key] ?? Infinity) ? null : value];
    }),
  );
};

const hasMeaningfulNutrition = (product: NormalizedProduct): boolean => {
  const { nutrition } = product;

  return (
    (nutrition.energy_kcal_100g != null && nutrition.energy_kcal_100g > 0) ||
    (nutrition.proteins_100g != null && nutrition.proteins_100g > 0) ||
    (nutrition.fat_100g != null && nutrition.fat_100g > 0) ||
    (nutrition.carbohydrates_100g != null && nutrition.carbohydrates_100g > 0)
  );
};

const truncate = (value: string | undefined, maxLength: number): string =>
  value && value.length > maxLength ? `${value.slice(0, maxLength)}…` : (value ?? '');

const sanitizeIngredients = (ingredients: string[]): string[] =>
  ingredients
    .map((ingredient) => ingredient.trim())
    .filter((ingredient) => ingredient.length > 0);

export const resolvePhotoProductSearchProvider = (): PhotoProductSearchProvider =>
  process.env[PHOTO_PRODUCT_SEARCH_PROVIDER_ENV] === 'tavily'
    ? 'tavily'
    : DEFAULT_PHOTO_PRODUCT_SEARCH_PROVIDER;

export const searchProductNutritionWithTavily = async (
  input: TavilyLookupInput,
): Promise<NormalizedProduct | null> => {
  if (!process.env.TAVILY_API_KEY || !process.env.OPENAI_API_KEY) {
    return null;
  }

  const searchQuery =
    [input.brand, input.productName].filter(Boolean).join(' ') || input.allText.slice(0, 300);

  try {
    const client = tavily({
      apiKey: process.env.TAVILY_API_KEY,
      clientSource: 'acme-photo-product-identification',
    });

    const searchResult = await client.search(
      `Find nutrition facts per 100g, Nutri-Score and ingredients for this food product: ${searchQuery}`,
      {
        searchDepth: 'fast',
        includeAnswer: 'advanced',
        maxResults: 5,
        timeout: 10_000,
      },
    );

    if (!searchResult.answer && searchResult.results.length === 0) {
      return null;
    }

    const structuredModel = (
      new ChatOpenAI({
        model: AI_MODELS.reason,
        apiKey: process.env.OPENAI_API_KEY,
        maxRetries: 1,
        timeout: 20_000,
        reasoning: { effort: 'low' },
      }) as any
    ).withStructuredOutput(tavilyStructuredProductSchema, {
      method: 'jsonSchema',
      name: 'tavily_product_nutrition_structurer',
    });

    const tavilyContext = [
      searchResult.answer ? `Tavily answer:\n${truncate(searchResult.answer, 2_000)}` : null,
      ...searchResult.results.map((result, index) =>
        [
          `Result #${index + 1}`,
          `Title: ${result.title}`,
          `URL: ${result.url}`,
          `Snippet: ${truncate(result.content, 1_000)}`,
          `Raw content: ${truncate(result.rawContent, 2_500)}`,
        ].join('\n'),
      ),
    ]
      .filter(Boolean)
      .join('\n\n---\n\n');

    const result: z.infer<typeof tavilyStructuredProductSchema> = await structuredModel.invoke([
      { role: 'system', content: TAVILY_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `OCR product name: ${input.productName ?? 'unknown'}
OCR brand: ${input.brand ?? 'unknown'}
OCR visible text: ${truncate(input.allText, 1_500)}

Tavily search data:
${tavilyContext}`,
      },
    ]);

    if (!result.found || result.confidence < MIN_CONFIDENCE || !result.product) {
      return null;
    }

    const saneNutrition = sanitizeNutritionValues({
      energy_kcal_100g: result.product.nutrition.energy_kcal_100g,
      proteins_100g: result.product.nutrition.proteins_100g,
      fat_100g: result.product.nutrition.fat_100g,
      saturated_fat_100g: result.product.nutrition.saturated_fat_100g,
      carbohydrates_100g: result.product.nutrition.carbohydrates_100g,
      sugars_100g: result.product.nutrition.sugars_100g,
      fiber_100g: result.product.nutrition.fiber_100g,
      salt_100g: result.product.nutrition.salt_100g,
      sodium_100g: result.product.nutrition.sodium_100g,
    });

    const parsed = normalizedProductSchema.safeParse({
      code: `photo-${randomUUID().slice(0, 12)}`,
      product_name: result.product.product_name ?? input.productName,
      brands: result.product.brands ?? input.brand,
      image_url: null,
      ingredients_text:
        result.product.ingredients_text ??
        (result.product.ingredients.length > 0
          ? result.product.ingredients.join(', ')
          : null),
      nutriscore_grade: result.product.nutriscore_grade,
      categories: null,
      quantity: null,
      serving_size: null,
      ingredients: sanitizeIngredients(result.product.ingredients),
      allergens: [],
      additives: [],
      additives_count: null,
      traces: [],
      countries: [],
      category_tags: [],
      images: {
        front_url: null,
        ingredients_url: null,
        nutrition_url: null,
      },
      nutrition: {
        energy_kcal_100g:
          saneNutrition.energy_kcal_100g != null
            ? Math.round(saneNutrition.energy_kcal_100g)
            : null,
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
        nutriscore_grade: result.product.nutriscore_grade,
        nutriscore_score: null,
        ecoscore_grade: null,
        ecoscore_score: null,
      },
    });

    if (!parsed.success || !hasMeaningfulNutrition(parsed.data)) {
      return null;
    }

    return withCanonicalProductImage(parsed.data);
  } catch (error) {
    console.warn('[PhotoID:tavily] failed:', error instanceof Error ? error.message : error);
    return null;
  }
};

