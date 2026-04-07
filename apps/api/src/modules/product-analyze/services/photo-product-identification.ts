import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { normalizedProductSchema, type NormalizedProduct } from '@acme/shared';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { AI_MODELS } from '../constants/models';
import { findBestVectorMatchedProduct } from './product-vector-search.service';
import {
  findByBarcode,
  createProduct,
} from '../repositories/productRepository';

// NOTE: Barcode detection is intentionally excluded from the photo flow.
// Even if a barcode is visible on the photo, we do NOT use it.
// Photo flow: OCR → vector + websearch (parallel) → pick winner.

export interface PhotoIdentificationResult {
  product: NormalizedProduct;
  shouldUploadPhoto: boolean;
  source: 'vector' | 'websearch';
}

export class PhotoIdentificationError extends Error {
  constructor(
    public readonly code: 'NOT_FOOD',
    message = 'This product does not appear to be a food item',
  ) {
    super(message);
    this.name = 'PhotoIdentificationError';
  }
}

// ---------------------------------------------------------------------------
// Step 1 — OCR: extract all visible text from the photo
// ---------------------------------------------------------------------------

const ocrResultSchema = z.object({
  allText: z
    .string()
    .describe(
      'ALL visible text from the photo, transcribed exactly as printed. Include every word, number, symbol you can read.',
    ),
  productName: z
    .string()
    .nullable()
    .describe('Best guess for the product name from the text'),
  brand: z
    .string()
    .nullable()
    .describe('Best guess for the brand / manufacturer from the text'),
  isFoodProduct: z
    .boolean()
    .describe('Whether this appears to be a food or beverage product'),
});

type OcrResult = z.infer<typeof ocrResultSchema>;

const OCR_SYSTEM_PROMPT = `You are an OCR specialist. Given a photo, extract ALL visible text EXACTLY as it appears on the packaging. Do NOT translate anything.

RULES:
- Transcribe every piece of text you can see: product name, brand, ingredients, nutrition facts, weight, etc.
- Preserve the ORIGINAL language exactly as printed. Do NOT translate to English or any other language.
- Identify the most likely product name and brand from the text (in the original language as printed).
- Determine whether this is a human food/beverage product.
- Do NOT guess or invent text that isn't visible in the image.
- Be thorough: even small/blurry text matters for product identification.

FOOD CLASSIFICATION:
- Set isFoodProduct=true ONLY when the photo clearly shows a human food or beverage product.
- Set isFoodProduct=false for non-food items such as cosmetics, personal care, household cleaners, medicine, supplements, pet food, toys, electronics, utensils, menus, receipts, shelves, or general objects.
- If the image is ambiguous or you are not confident it is human food/drink, return isFoodProduct=false.`;

// ---------------------------------------------------------------------------
// Step 2 — Search: find the product by extracted text
// ---------------------------------------------------------------------------

const websearchProductSchema = z.object({
  found: z.boolean().describe('Whether a specific food product was found'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence in the product identification'),
  product: z
    .object({
      code: z
        .string()
        .describe('Product barcode/EAN if known, or empty string'),
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

const SEARCH_SYSTEM_PROMPT = `You are a food product identification assistant. You are given text that was extracted from a product photo via OCR.
Your job is to identify the exact product AND find its complete nutritional information using web search.

YOU MUST PERFORM MULTIPLE WEB SEARCHES:
1. First search: Find the exact product by name and brand. Try searching in the original language first, then in English if needed.
2. Second search: Find the product's NUTRITION FACTS (calories, protein, fat, carbs, sugar, salt, fiber per 100g). Search for "[product name] nutrition facts per 100g" or "[product name] пищевая ценность" or "[product name] харчова цінність".
3. Third search: Find the product's INGREDIENTS list. Search for "[product name] ingredients" or "[product name] состав" or "[product name] склад".
4. If the first searches didn't find nutrition data, try searching on OpenFoodFacts: "site:openfoodfacts.org [product name]" or "site:openfoodfacts.org [barcode]".

RULES:
- You MUST search for nutrition data separately if the first search didn't include it. Do NOT return all-zero nutrition values.
- Do NOT fabricate or guess nutrition values or ingredients — they must come from a reliable source.
- Prefer data from (in order): OpenFoodFacts, manufacturer websites, major retailers, FatSecret, USDA.
- All output fields (brand, ingredients, etc.) MUST be in English. If the original data is not in English, translate it.
- The product_name field MUST contain ONLY the short product name WITHOUT the brand (e.g. "Oat Drink" NOT "Green Smile Oat Drink"). The brand goes in the "brands" field. Strip descriptions, percentages, preparation details, and marketing text. Keep the original language as found on the packaging.
- Ingredients should be a clean array of individual ingredient names (in English).
- Allergens should be normalized lowercase strings (in English).
- If no reliable result is found, return found: false.
- Set confidence 0.0-1.0 based on certainty. Below 0.5 means too uncertain — set found to false.
- If you found the product but could NOT find nutrition data, still return found: true with null nutrition values (NOT zeros).

STRICT NUTRITION RULES (per 100g):
- ALL nutrition values MUST be per 100g. If only per-serving data is available, calculate per 100g.
- Round all nutrition values to 1 decimal place (e.g. 12.3, not 12.34 or 12).
- energy_kcal_100g: round to nearest whole number (integer, no decimals).
- If a nutrition value is not available from the source, set it to null. NEVER use 0 as a placeholder for missing data.
- Use the SAME source for ALL nutrition values — do not mix values from different sources.
- If the product has multiple variants (flavors, sizes), use the EXACT variant matching the product name.`;

const MIN_CONFIDENCE = 0.5;

const roundTo1 = (v: number | null): number | null =>
  v != null ? Math.round(v * 10) / 10 : null;

const getSearchModel = () =>
  new ChatOpenAI({
    model: AI_MODELS.reason,
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 1,
  });

const getVisionModel = () =>
  new ChatOpenAI({
    model: AI_MODELS.vision,
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 1,
  });

// ---------------------------------------------------------------------------
// Step 1 implementation
// ---------------------------------------------------------------------------

export { extractTextFromPhoto };
export type { OcrResult };

const extractTextFromPhoto = async (
  imageBase64: string,
): Promise<OcrResult | null> => {
  const model = (getVisionModel() as any).withStructuredOutput(
    ocrResultSchema,
    {
      method: 'jsonSchema',
      name: 'photo_ocr',
    },
  );

  const result = await model.invoke([
    new SystemMessage(OCR_SYSTEM_PROMPT),
    new HumanMessage({
      content: [
        {
          type: 'text',
          text: 'Extract all visible text from this product photo.',
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        },
      ],
    }),
  ]);

  return result as OcrResult;
};

// ---------------------------------------------------------------------------
// Step 2a — try existing barcode pipeline
// ---------------------------------------------------------------------------

/** Check if a product has any meaningful nutrition data (not all zeros/nulls) */
const hasNutritionData = (product: NormalizedProduct): boolean => {
  const n = product.nutrition;
  return (
    (n.energy_kcal_100g != null && n.energy_kcal_100g > 0) ||
    (n.proteins_100g != null && n.proteins_100g > 0) ||
    (n.fat_100g != null && n.fat_100g > 0) ||
    (n.carbohydrates_100g != null && n.carbohydrates_100g > 0)
  );
};

/** Check if a product has a real image URL (not null, empty, or "/null") */
const hasValidImage = (product: NormalizedProduct): boolean => {
  const url = product.image_url;
  if (!url) return false;
  const lower = url.trim().toLowerCase();
  return (
    lower.length > 0 && lower !== '/null' && lower !== 'null' && lower !== 'n/a'
  );
};

// ---------------------------------------------------------------------------
// Step 2b — web search by extracted text
// ---------------------------------------------------------------------------

const searchByExtractedText = async (
  ocr: OcrResult,
): Promise<NormalizedProduct | null> => {
  const t0 = Date.now();
  const elapsed = () => `${Date.now() - t0}ms`;
  const searchQuery =
    [ocr.brand, ocr.productName].filter(Boolean).join(' ') ||
    ocr.allText.slice(0, 300);

  console.log(`[PhotoID:search] start query="${searchQuery}" [${elapsed()}]`);

  const structuredModel = (getSearchModel() as any)
    .bindTools([{ type: 'web_search_preview', search_context_size: 'high' }])
    .withStructuredOutput(websearchProductSchema, {
      method: 'jsonSchema',
      name: 'text_product_search',
    });

  const result: z.infer<typeof websearchProductSchema> =
    await structuredModel.invoke([
      { role: 'system', content: SEARCH_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Find the food product matching this text extracted from a product photo.

DETECTED PRODUCT NAME: ${ocr.productName ?? 'unknown'}
DETECTED BRAND: ${ocr.brand ?? 'unknown'}

Search for: "${searchQuery}"`,
      },
    ]);

  const { found, confidence, product } = result;
  const productLog = product
    ? `product_name="${product.product_name ?? 'null'}" brands="${product.brands ?? 'null'}" code="${product.code || 'null'}"`
    : 'product=null';

  console.log(
    `[PhotoID:search] done found=${found} confidence=${confidence} ${productLog} [${elapsed()}]`,
  );

  if (!found || confidence < MIN_CONFIDENCE || !product) return null;

  const code = product.code || `photo-${randomUUID().slice(0, 12)}`;

  // Normalize nutrition values to consistent precision
  const nutrition = product.nutrition;
  const normalizedNutrition = {
    energy_kcal_100g:
      nutrition.energy_kcal_100g != null
        ? Math.round(nutrition.energy_kcal_100g)
        : null,
    proteins_100g: roundTo1(nutrition.proteins_100g),
    fat_100g: roundTo1(nutrition.fat_100g),
    saturated_fat_100g: roundTo1(nutrition.saturated_fat_100g),
    carbohydrates_100g: roundTo1(nutrition.carbohydrates_100g),
    sugars_100g: roundTo1(nutrition.sugars_100g),
    fiber_100g: roundTo1(nutrition.fiber_100g),
    salt_100g: roundTo1(nutrition.salt_100g),
    sodium_100g: roundTo1(nutrition.sodium_100g),
  };

  const parsed = normalizedProductSchema.safeParse({
    ...product,
    code,
    nutrition: normalizedNutrition,
  });
  if (!parsed.success) return null;

  // Reject products without meaningful nutrition data — not worth saving
  if (!hasNutritionData(parsed.data)) {
    console.log(
      `[PhotoID:search] ⚠️ Product found but has no nutrition data — treating as not found (code=${code})`,
    );
    return null;
  }

  return parsed.data;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// helper: pick winner from parallel race results
// ---------------------------------------------------------------------------

type RaceResult = {
  vector: {
    product: NormalizedProduct;
    similarity: number;
    queryText: string;
  } | null;
  websearch: NormalizedProduct | null;
};

const pickWinner = (
  race: RaceResult,
  elapsed: () => string,
): PhotoIdentificationResult | null => {
  // Priority 1 — vector match with nutrition
  if (race.vector && hasNutritionData(race.vector.product)) {
    console.log(
      `[PhotoID] ✅ Winner: vector — "${race.vector.product.product_name}" sim=${race.vector.similarity.toFixed(3)} [${elapsed()}]`,
    );
    return {
      product: race.vector.product,
      shouldUploadPhoto: !hasValidImage(race.vector.product),
      source: 'vector',
    };
  }

  // Priority 2 — websearch result
  if (race.websearch) {
    console.log(
      `[PhotoID] ✅ Winner: websearch — "${race.websearch.product_name}" code=${race.websearch.code} [${elapsed()}]`,
    );
    return {
      product: race.websearch,
      shouldUploadPhoto: true,
      source: 'websearch',
    };
  }

  return null;
};

/**
 * Identify a food product from a photo using a two-step approach:
 * 1. OCR — extract all visible text from the photo (fast vision model)
 * 2. Parallel lookup — barcode + vector + websearch run concurrently
 *
 * The first result with nutrition data wins. Typical latency: OCR ~7s + lookup ~8-16s.
 */
export const identifyProductByPhoto = async (
  imageBase64: string,
  precomputedOcr?: OcrResult,
): Promise<PhotoIdentificationResult | null> => {
  const t0 = Date.now();
  const elapsed = () => `${Date.now() - t0}ms`;

  if (!process.env.OPENAI_API_KEY) {
    console.error('[PhotoID] ❌ OPENAI_API_KEY is not set');
    return null;
  }

  if (precomputedOcr) {
    console.log(
      `[PhotoID] 1/2 Reusing OCR — product="${precomputedOcr.productName}" brand="${precomputedOcr.brand}" food=${precomputedOcr.isFoodProduct} textLen=${precomputedOcr.allText.length} [${elapsed()}]`,
    );
  } else {
    console.log(
      `[PhotoID] 1/2 Starting OCR — base64 length=${imageBase64.length} chars (~${Math.round((imageBase64.length * 0.75) / 1024)}KB)`,
    );
  }

  try {
    // -----------------------------------------------------------------------
    // Step 1: Extract text from photo
    // -----------------------------------------------------------------------
    const ocr = precomputedOcr ?? (await extractTextFromPhoto(imageBase64));

    if (!ocr) {
      console.log(`[PhotoID] ❌ OCR returned null [${elapsed()}]`);
      return null;
    }

    if (!precomputedOcr) {
      console.log(
        `[PhotoID] 2/2 OCR done — product="${ocr.productName}" brand="${ocr.brand}" food=${ocr.isFoodProduct} textLen=${ocr.allText.length} [${elapsed()}]`,
      );
    }

    if (!ocr.isFoodProduct) {
      console.log(`[PhotoID] ❌ Not a food product [${elapsed()}]`);
      throw new PhotoIdentificationError('NOT_FOOD');
    }

    // -----------------------------------------------------------------------
    // Step 2: Fire lookup strategies IN PARALLEL (no barcode resolution)
    //   - vector:    DB vector similarity search
    //   - websearch: AI web search by OCR text
    // -----------------------------------------------------------------------

    console.log(`[PhotoID] 2/2 Starting parallel lookup [${elapsed()}]`);

    const vectorPromise = ocr.productName
      ? findBestVectorMatchedProduct({
          productName: ocr.productName,
          brand: ocr.brand,
        }).catch((e) => {
          console.warn(
            `[PhotoID] vector branch error:`,
            e instanceof Error ? e.message : e,
          );
          return null;
        })
      : Promise.resolve(null);

    const websearchPromise = searchByExtractedText(ocr).catch((e) => {
      console.warn(
        `[PhotoID] websearch branch error:`,
        e instanceof Error ? e.message : e,
      );
      return null;
    });

    const [vector, websearch] = await Promise.all([
      vectorPromise,
      websearchPromise,
    ]);

    console.log(
      `[PhotoID] 2/2 Parallel lookup done [${elapsed()}] — vector=${vector ? `✅ sim=${vector.similarity.toFixed(3)}` : '❌'} websearch=${websearch ? '✅' : '❌'}`,
    );

    const winner = pickWinner({ vector, websearch }, elapsed);

    if (!winner) {
      console.log(`[PhotoID] ❌ All lookup strategies failed [${elapsed()}]`);
      return null;
    }

    // -----------------------------------------------------------------------
    // Step 3: Merge with DB if websearch found existing product
    // -----------------------------------------------------------------------
    if (winner.source === 'websearch') {
      const existingProduct = await findByBarcode(winner.product.code);
      if (existingProduct) {
        if (
          hasNutritionData(winner.product) &&
          !hasNutritionData(existingProduct)
        ) {
          console.log(
            `[PhotoID] 📝 DB product lacks nutrition — updating [${elapsed()}]`,
          );
          const updated = await createProduct(winner.product);
          return {
            product: updated,
            shouldUploadPhoto: !hasValidImage(updated),
            source: 'websearch',
          };
        }
        console.log(
          `[PhotoID] ♻️ Reusing existing DB product — code=${existingProduct.code} [${elapsed()}]`,
        );
        return {
          product: existingProduct,
          shouldUploadPhoto: !hasValidImage(existingProduct),
          source: 'websearch',
        };
      }
    }

    return winner;
  } catch (error) {
    if (error instanceof PhotoIdentificationError) {
      throw error;
    }

    console.error(
      `[PhotoID] ❌ Uncaught error [${elapsed()}]:`,
      error instanceof Error ? `${error.message}\n${error.stack}` : error,
    );
    return null;
  }
};
