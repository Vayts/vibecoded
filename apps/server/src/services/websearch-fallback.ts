import { ChatOpenAI, tools } from '@langchain/openai';
import { normalizedProductSchema, type NormalizedProduct } from '@acme/shared';
import { z } from 'zod';
import { AI_MODELS } from '../domain/flashcards/prompts';

const websearchProductSchema = z.object({
  found: z.boolean().describe('Whether a specific food product was found for this barcode'),
  isFoodProduct: z.boolean().describe('Whether the found product is a food/beverage item'),
  confidence: z.number().min(0).max(1).describe('Confidence in the product identification'),
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
- Nutrition values should be per 100g.
- Set confidence based on how certain you are about the identification (0.0 to 1.0).
- If no reliable result is found, return found: false.`;

const getModel = () =>
  new ChatOpenAI({
    model: AI_MODELS.mini,
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 2,
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
    const model = getModel();
    const response = await model.invoke(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Find the food product with barcode: ${barcode}`,
        },
      ],
      {
        tools: [tools.webSearch({ search_context_size: 'medium' })],
      },
    );

    const text =
      typeof response.content === 'string'
        ? response.content
        : response.content
            .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
            .map((c) => c.text)
            .join('');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = websearchProductSchema.safeParse(JSON.parse(jsonMatch[0]));
    if (!parsed.success) {
      return null;
    }

    const { found, isFoodProduct, confidence, product } = parsed.data;

    if (!found || !isFoodProduct || confidence < MIN_CONFIDENCE || !product) {
      return null;
    }

    // Ensure barcode is set correctly
    const normalizedProduct = normalizedProductSchema.safeParse({
      ...product,
      code: barcode,
    });

    return normalizedProduct.success ? normalizedProduct.data : null;
  } catch (error) {
    console.error('[WebSearchFallback] Failed:', error instanceof Error ? error.message : error);
    return null;
  }
};
