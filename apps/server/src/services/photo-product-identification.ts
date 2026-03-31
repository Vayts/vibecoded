import { ChatOpenAI, tools } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { normalizedProductSchema, type NormalizedProduct } from '@acme/shared';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { AI_MODELS } from '../domain/flashcards/prompts';

const photoProductSchema = z.object({
  found: z.boolean().describe('Whether a food product was identified in the photo'),
  isFoodProduct: z
    .boolean()
    .describe('Whether the identified item is a food or beverage product'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence in the product identification (0.0 to 1.0)'),
  product: z
    .object({
      barcode: z.string().nullable().describe('Product barcode/EAN if found via web search'),
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

const SYSTEM_PROMPT = `You are a food product identification expert. Given a photo of a food product, your job is to identify it and find complete nutritional information.

STEPS:
1. Analyze the photo to identify the product — look for brand name, product name, packaging, any visible text or barcode
2. Use web search to find the exact product's:
   - Official product name
   - Brand
   - Product image URL (from manufacturer or major retailer)
   - Complete nutrition facts (per 100g)
   - Complete ingredients list
   - Allergens
   - Nutri-Score grade (if available in any market)
   - Barcode/EAN code if findable
3. Return all data in the structured JSON format

RULES:
- Only identify food and beverage products
- If the photo does not clearly show a food/beverage product, set found to false
- You MUST use web search to verify the product identity and gather nutritional data
- Do NOT fabricate or guess nutrition values or ingredients — they must come from a reliable source
- Prefer data from: manufacturer websites, major retailers (Walmart, Tesco, Carrefour), OpenFoodFacts, nutrition databases
- If the product name is in a foreign language, keep the original name
- Set confidence based on how certain you are (0.0 to 1.0):
  - 0.9-1.0: Exact product clearly visible and verified via web
  - 0.7-0.8: Product identified with high confidence but some data may be from similar variants
  - Below 0.7: Too uncertain — set found to false
- If nutrition data per 100g is not available, try to calculate from serving size data
- Ingredients should be a clean array of individual ingredient names
- Allergens should be normalized lowercase strings
- If you cannot find reliable data, prefer returning found: false over guessing

RESPOND WITH JSON ONLY. No explanation text, no markdown formatting. Just the raw JSON object.`;

const getModel = () =>
  new ChatOpenAI({
    model: AI_MODELS.vision,
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 2,
  });

/**
 * Identify a food product from a photo using AI vision + web search.
 * Returns a normalized product or null if the product cannot be reliably identified.
 */
export const identifyProductByPhoto = async (
  imageBase64: string,
): Promise<NormalizedProduct | null> => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const model = getModel();

    const response = await model.invoke(
      [
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage({
          content: [
            {
              type: 'text',
              text: 'Identify this food product and find its complete nutritional data.',
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
            },
          ],
        }),
      ],
      {
        tools: [tools.webSearch({ search_context_size: 'high' })],
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
      console.error('[PhotoIdentification] No JSON found in response');
      return null;
    }

    const parsed = photoProductSchema.safeParse(JSON.parse(jsonMatch[0]));
    if (!parsed.success) {
      console.error('[PhotoIdentification] Schema validation failed:', parsed.error.message);
      return null;
    }

    const { found, isFoodProduct, confidence, product } = parsed.data;

    if (!found || !isFoodProduct || confidence < MIN_CONFIDENCE || !product) {
      console.log(
        `[PhotoIdentification] Rejected: found=${found} food=${isFoodProduct} confidence=${confidence}`,
      );
      return null;
    }

    // Use real barcode if found, otherwise generate synthetic code
    const code = product.barcode || `photo-${randomUUID().slice(0, 12)}`;

    const normalized = normalizedProductSchema.safeParse({
      ...product,
      code,
      image_url: product.image_url || product.images.front_url,
    });

    if (!normalized.success) {
      console.error('[PhotoIdentification] Normalization failed:', normalized.error.message);
      return null;
    }

    return normalized.data;
  } catch (error) {
    console.error(
      '[PhotoIdentification] Failed:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
};
