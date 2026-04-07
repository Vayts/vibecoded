import { ChatOpenAI } from '@langchain/openai';
import { normalizedProductSchema, type NormalizedProduct } from '@acme/shared';
import { z } from 'zod';
import { AI_MODELS } from '../constants/models';
import { hasNutritionData } from '../domain/product-facts/build-product-facts';

const websearchProductSchema = z.object({
  found: z
    .boolean()
    .describe('Whether a specific food product was found for this barcode'),
  isFoodProduct: z
    .boolean()
    .describe('Whether the found product is a food/beverage item'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence in the product identification'),
  product: z
    .object({
      code: z.string(),
      product_name: z.string().nullable(),
      brands: z.string().nullable(),
      image_url: z.string().nullable(),
      ingredients_text: z.string().nullable(),
      nutriscore_grade: z.string().nullable(),
      categories: z.string().nullable(),
      quantity: z.string().nullable(),
      serving_size: z.string().nullable(),
      ingredients: z.array(z.string()),
      allergens: z.array(z.string()),
      additives: z.array(z.string()),
      additives_count: z.number().nullable(),
      traces: z.array(z.string()),
      countries: z.array(z.string()),
      category_tags: z.array(z.string()),
      images: z.object({
        front_url: z.string().nullable(),
        ingredients_url: z.string().nullable(),
        nutrition_url: z.string().nullable(),
      }),
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
      scores: z.object({
        nutriscore_grade: z.string().nullable(),
        nutriscore_score: z.number().nullable(),
        ecoscore_grade: z.string().nullable(),
        ecoscore_score: z.number().nullable(),
      }),
    })
    .nullable()
    .describe('Normalized product data if found'),
});

const MIN_CONFIDENCE = 0.7;

const SYSTEM_PROMPT = `You are a food product identification assistant. Given a barcode number, search the web to find the corresponding food product.

RULES:
- Only return food and beverage products. If the barcode matches a non-food item (electronics, clothing, books, etc.), set isFoodProduct to false.
- Search for the exact barcode number to find the specific product.
- Do not guess or return approximate matches. If you cannot confidently identify the exact product, set found to false.
- Extract as much product data as possible: name, brand, ingredients, nutrition, allergens.
- Normalize all data into the structured format.
- Ingredients should be a clean list of individual ingredient names.

CRITICAL — NUTRITION VALUES PER 100g ONLY:
- Nutrition values MUST be per 100g (or per 100ml for liquids). NOT per serving, NOT per package, NOT per 1kg.
- Many websites show nutrition per serving. You MUST convert to per 100g.
  Example: if "protein: 2.5g per 30g serving" → per 100g = 2.5 / 30 * 100 = 8.3g.
  Example: if values are per 1kg → divide by 10.
- VERIFY: carbs + protein + fat should sum to roughly ≤ 100g. If they sum > 100, you have wrong units.

- Set confidence based on how certain you are about the identification (0.0 to 1.0).
- If no reliable result is found, return found: false.`;

const getBarcodeModel = () =>
  new ChatOpenAI({
    model: AI_MODELS.reason,
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 1,
    timeout: 15_000,
    reasoning: { effort: 'low' },
  });

/**
 * Search the web for a food product by barcode.
 * Returns a normalized product or null if not found / not food.
 */
export const searchProductByBarcode = async (
  barcode: string,
): Promise<NormalizedProduct | null> => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    // bindTools for web search BEFORE withStructuredOutput so the tool is sent to the API
    const structuredModel = (getBarcodeModel() as any)
      .bindTools([{ type: 'web_search_preview', search_context_size: 'low' }])
      .withStructuredOutput(websearchProductSchema, {
        method: 'jsonSchema',
        name: 'websearch_product_lookup',
      });

    const result: z.infer<typeof websearchProductSchema> =
      await structuredModel.invoke([
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Find the food product with barcode: ${barcode}`,
        },
      ]);

    const { found, isFoodProduct, confidence, product } = result;

    if (!found || !isFoodProduct || confidence < MIN_CONFIDENCE || !product) {
      return null;
    }

    // Sanity check nutrition values — AI sometimes returns per-serving or per-kg
    if (product.nutrition) {
      const n = product.nutrition;
      const macros = [n.proteins_100g, n.fat_100g, n.carbohydrates_100g].filter(
        (v): v is number => v != null,
      );
      const macroSum = macros.reduce((s, v) => s + v, 0);
      if (macroSum > 150) {
        // Likely per-kg or wrong units — scale down by 10
        console.log(
          `[WebSearchFallback] ⚠️ Macro sum=${macroSum}g > 150g — scaling nutrition by 10x (likely per-kg)`,
        );
        product.nutrition = {
          energy_kcal_100g:
            n.energy_kcal_100g != null
              ? Math.round(n.energy_kcal_100g / 10)
              : null,
          proteins_100g:
            n.proteins_100g != null
              ? Math.round((n.proteins_100g / 10) * 10) / 10
              : null,
          fat_100g:
            n.fat_100g != null ? Math.round((n.fat_100g / 10) * 10) / 10 : null,
          saturated_fat_100g:
            n.saturated_fat_100g != null
              ? Math.round((n.saturated_fat_100g / 10) * 10) / 10
              : null,
          carbohydrates_100g:
            n.carbohydrates_100g != null
              ? Math.round((n.carbohydrates_100g / 10) * 10) / 10
              : null,
          sugars_100g:
            n.sugars_100g != null
              ? Math.round((n.sugars_100g / 10) * 10) / 10
              : null,
          fiber_100g:
            n.fiber_100g != null
              ? Math.round((n.fiber_100g / 10) * 10) / 10
              : null,
          salt_100g:
            n.salt_100g != null
              ? Math.round((n.salt_100g / 10) * 10) / 10
              : null,
          sodium_100g:
            n.sodium_100g != null
              ? Math.round((n.sodium_100g / 10) * 10) / 10
              : null,
        };
      }
    }

    // Normalize null-like values in image URLs (AI sometimes returns "/" or "/null")
    const NULL_LIKE_URLS = new Set([
      '/',
      '/null',
      'null',
      'n/a',
      'none',
      '-',
      '',
    ]);
    if (
      product.image_url &&
      NULL_LIKE_URLS.has(product.image_url.trim().toLowerCase())
    ) {
      product.image_url = null;
    }
    if (product.images) {
      if (
        product.images.front_url &&
        NULL_LIKE_URLS.has(product.images.front_url.trim().toLowerCase())
      ) {
        product.images.front_url = null;
      }
      if (
        product.images.ingredients_url &&
        NULL_LIKE_URLS.has(product.images.ingredients_url.trim().toLowerCase())
      ) {
        product.images.ingredients_url = null;
      }
      if (
        product.images.nutrition_url &&
        NULL_LIKE_URLS.has(product.images.nutrition_url.trim().toLowerCase())
      ) {
        product.images.nutrition_url = null;
      }
    }

    // Ensure barcode is set correctly
    const normalizedProduct = normalizedProductSchema.safeParse({
      ...product,
      code: barcode,
    });

    if (!normalizedProduct.success) return null;

    // Reject products without meaningful nutrition data — not worth saving
    if (!hasNutritionData(normalizedProduct.data)) {
      console.log(
        `[WebSearchFallback] ⚠️ Product found but has no nutrition data — treating as not found (barcode=${barcode})`,
      );
      return null;
    }

    return normalizedProduct.data;
  } catch (error) {
    console.error(
      '[WebSearchFallback] Failed:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
};
