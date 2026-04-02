import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { normalizedProductSchema, type NormalizedProduct } from '@acme/shared';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { AI_MODELS } from '../constants/models';
import { resolveProduct } from '../routes/scanner-helpers';
import { findBestVectorMatchedProduct } from './product-vector-search.service';
import { findByBarcode, createProduct } from '../repositories/productRepository';

export interface PhotoIdentificationResult {
  product: NormalizedProduct;
  shouldUploadPhoto: boolean;
  source: 'barcode' | 'vector' | 'websearch';
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
  barcodes: z
    .array(z.string())
    .describe(
      'Any barcode / EAN / UPC numbers visible in the image. Only include numbers you are confident about.',
    ),
  productName: z.string().nullable().describe('Best guess for the product name from the text'),
  brand: z.string().nullable().describe('Best guess for the brand / manufacturer from the text'),
  isFoodProduct: z.boolean().describe('Whether this appears to be a food or beverage product'),
});

type OcrResult = z.infer<typeof ocrResultSchema>;

const OCR_SYSTEM_PROMPT = `You are an OCR specialist. Given a photo, extract ALL visible text EXACTLY as it appears on the packaging. Do NOT translate anything.

RULES:
- Transcribe every piece of text you can see: product name, brand, ingredients, nutrition facts, barcodes, weight, etc.
- Preserve the ORIGINAL language exactly as printed. Do NOT translate to English or any other language.
- If you see barcode numbers (EAN-13, UPC-A, etc.), list them in the barcodes array.
- Identify the most likely product name and brand from the text (in the original language as printed).
- Determine whether this is a food/beverage product.
- Do NOT guess or invent text that isn't visible in the image.
- Be thorough: even small/blurry text matters for product identification.`;

// ---------------------------------------------------------------------------
// Step 2 — Search: find the product by extracted text
// ---------------------------------------------------------------------------

const websearchProductSchema = z.object({
  found: z.boolean().describe('Whether a specific food product was found'),
  confidence: z.number().min(0).max(1).describe('Confidence in the product identification'),
  product: z
    .object({
      code: z.string().describe('Product barcode/EAN if known, or empty string'),
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
- The product_name field MUST be left in the original language as found on the packaging (do NOT translate product_name).
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
    reasoning: {"effort": "low"},
  });

const getVisionModel = () =>
  new ChatOpenAI({
    model: AI_MODELS.vision,
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 2,
    reasoning: {"effort": "low"},
  });

// ---------------------------------------------------------------------------
// Step 1 implementation
// ---------------------------------------------------------------------------

const extractTextFromPhoto = async (imageBase64: string): Promise<OcrResult | null> => {
  const model = (getVisionModel() as any).withStructuredOutput(ocrResultSchema, {
    method: 'jsonSchema',
    name: 'photo_ocr',
  });

  const result = await model.invoke([
    new SystemMessage(OCR_SYSTEM_PROMPT),
    new HumanMessage({
      content: [
        { type: 'text', text: 'Extract all visible text from this product photo.' },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
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
  return lower.length > 0 && lower !== '/null' && lower !== 'null' && lower !== 'n/a';
};

const tryBarcodeResolution = async (
  barcodes: string[],
): Promise<PhotoIdentificationResult | null> => {
  for (const barcode of barcodes) {
    const cleaned = barcode.replace(/\D/g, '');
    if (cleaned.length < 8 || cleaned.length > 14) continue;
    const resolved = await resolveProduct(cleaned);
    if (resolved) {
      return {
        product: resolved.product,
        shouldUploadPhoto: !resolved.wasExistingInDb,
        source: 'barcode',
      };
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// Step 2b — web search by extracted text
// ---------------------------------------------------------------------------

const searchByExtractedText = async (
  ocr: OcrResult,
): Promise<NormalizedProduct | null> => {
  const structuredModel = (getVisionModel() as any)
    .bindTools([{ type: 'web_search_preview', search_context_size: 'high' }])
    .withStructuredOutput(websearchProductSchema, {
      method: 'jsonSchema',
      name: 'text_product_search',
    });

  const searchQuery = [ocr.brand, ocr.productName].filter(Boolean).join(' ') || ocr.allText.slice(0, 300);

  const result: z.infer<typeof websearchProductSchema> = await structuredModel.invoke([
    { role: 'system', content: SEARCH_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Find the food product matching this text extracted from a product photo.

EXTRACTED TEXT:
${ocr.allText}

DETECTED PRODUCT NAME: ${ocr.productName ?? 'unknown'}
DETECTED BRAND: ${ocr.brand ?? 'unknown'}

Search for: "${searchQuery}"`,
    },
  ]);

  const { found, confidence, product } = result;
  console.log(`[PhotoID:search] result: found=${found} confidence=${confidence} product_name="${product?.product_name}" brands="${product?.brands}" code="${product?.code}"`);

  if (!found || confidence < MIN_CONFIDENCE || !product) return null;

  const code = product.code || `photo-${randomUUID().slice(0, 12)}`;

  // Normalize nutrition values to consistent precision
  const nutrition = product.nutrition;
  const normalizedNutrition = {
    energy_kcal_100g: nutrition.energy_kcal_100g != null ? Math.round(nutrition.energy_kcal_100g) : null,
    proteins_100g: roundTo1(nutrition.proteins_100g),
    fat_100g: roundTo1(nutrition.fat_100g),
    saturated_fat_100g: roundTo1(nutrition.saturated_fat_100g),
    carbohydrates_100g: roundTo1(nutrition.carbohydrates_100g),
    sugars_100g: roundTo1(nutrition.sugars_100g),
    fiber_100g: roundTo1(nutrition.fiber_100g),
    salt_100g: roundTo1(nutrition.salt_100g),
    sodium_100g: roundTo1(nutrition.sodium_100g),
  };

  const parsed = normalizedProductSchema.safeParse({ ...product, code, nutrition: normalizedNutrition });
  return parsed.success ? parsed.data : null;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Identify a food product from a photo using a two-step approach:
 * 1. OCR — extract all visible text from the photo (fast vision model)
 * 2. Lookup — try barcode pipeline first, then DB vector match, then web-search by extracted text
 */
export const identifyProductByPhoto = async (
  imageBase64: string,
): Promise<PhotoIdentificationResult | null> => {
  const t0 = Date.now();
  const elapsed = () => `${Date.now() - t0}ms`;

  if (!process.env.OPENAI_API_KEY) {
    console.error('[PhotoID] ❌ OPENAI_API_KEY is not set');
    return null;
  }

  console.log(
    `[PhotoID] 1/4 Starting OCR — base64 length=${imageBase64.length} chars (~${Math.round((imageBase64.length * 0.75) / 1024)}KB)`,
  );

  try {
    // Step 1: Extract text from photo
    const ocr = await extractTextFromPhoto(imageBase64);

    if (!ocr) {
      console.log(`[PhotoID] ❌ OCR returned null [${elapsed()}]`);
      return null;
    }

    console.log(
      `[PhotoID] 2/4 OCR done — product="${ocr.productName}" brand="${ocr.brand}" barcodes=[${ocr.barcodes.join(',')}] food=${ocr.isFoodProduct} textLen=${ocr.allText.length} [${elapsed()}]`,
    );

    if (!ocr.isFoodProduct) {
      console.log(`[PhotoID] ❌ Not a food product [${elapsed()}]`);
      return null;
    }

    // Step 2a: If barcodes found, try existing pipeline (DB → OpenFoodFacts → WebSearch)
    let barcodeProduct: PhotoIdentificationResult | null = null;
    if (ocr.barcodes.length > 0) {
      console.log(`[PhotoID] 3/4 Trying barcode resolution: [${ocr.barcodes.join(', ')}] [${elapsed()}]`);
      barcodeProduct = await tryBarcodeResolution(ocr.barcodes);
      if (barcodeProduct && hasNutritionData(barcodeProduct.product)) {
        console.log(
          `[PhotoID] ✅ Found via barcode (with nutrition) — "${barcodeProduct.product.product_name}" (${barcodeProduct.product.brands}) shouldUploadPhoto=${barcodeProduct.shouldUploadPhoto} [${elapsed()}]`,
        );
        return barcodeProduct;
      }
      if (barcodeProduct) {
        console.log(`[PhotoID] 3/4 Barcode found product but no nutrition data, will try text search [${elapsed()}]`);
      } else {
        console.log(`[PhotoID] 3/4 Barcode resolution failed, falling back to text search [${elapsed()}]`);
      }
    } else {
      console.log(`[PhotoID] 3/4 No barcodes detected, using text search [${elapsed()}]`);
    }

    // Step 2b: Try vector search in our own product DB before using WebSearch.
    if (ocr.productName) {
      console.log(
        `[PhotoID] 3/4 Trying DB vector match — product="${ocr.productName}" brand="${ocr.brand ?? ''}" [${elapsed()}]`,
      );
      const vectorMatch = await findBestVectorMatchedProduct({
        productName: ocr.productName,
        brand: ocr.brand,
      });

      if (vectorMatch) {
        // Only accept vector match if it has nutrition data — otherwise it's a shell product
        if (!hasNutritionData(vectorMatch.product)) {
          console.log(
            `[PhotoID] 3/4 DB vector match found but has no nutrition data — skipping — "${vectorMatch.product.product_name}" similarity=${vectorMatch.similarity.toFixed(3)} [${elapsed()}]`,
          );
        } else {
          console.log(
            `[PhotoID] ✅ Found via DB vector match — "${vectorMatch.product.product_name}" (${vectorMatch.product.brands}) similarity=${vectorMatch.similarity.toFixed(3)} query="${vectorMatch.queryText}" [${elapsed()}]`,
          );
          return {
            product: vectorMatch.product,
            shouldUploadPhoto: !hasValidImage(vectorMatch.product),
            source: 'vector',
          };
        }
      }

      console.log(`[PhotoID] 3/4 No strong DB vector match, falling back to WebSearch [${elapsed()}]`);
    } else {
      console.log(`[PhotoID] 3/4 No extracted product name, skipping DB vector match [${elapsed()}]`);
    }

    // Step 2c: Search by extracted text (product name, brand, etc.) — retry once on failure
    console.log(
      `[PhotoID] 3/4 Trying WebSearch fallback — product="${ocr.productName ?? ''}" brand="${ocr.brand ?? ''}" [${elapsed()}]`,
    );
    let product = await searchByExtractedText(ocr);

    if (!product) {
      console.log(`[PhotoID] 🔄 Text search attempt 1 failed, retrying... [${elapsed()}]`);
      product = await searchByExtractedText(ocr);
    }

    if (!product) {
      // If barcode found a product (even without nutrition), return it as last resort
      if (barcodeProduct) {
        console.log(`[PhotoID] ⚠️ Text search failed, returning barcode product without nutrition [${elapsed()}]`);
        return barcodeProduct;
      }
      console.log(`[PhotoID] ❌ Text search found nothing after 2 attempts [${elapsed()}]`);
      return null;
    }

    // If barcode pipeline found the product with a real barcode, use that code instead of a synthetic one
    if (barcodeProduct && product.code.startsWith('photo-')) {
      product = { ...product, code: barcodeProduct.product.code };
    }

    // Post-process: if brands are not in English, re-ask the model for English translation
    // (defensive, in case the model ignores the prompt)
    const isEnglish = (text: string | null | undefined) => {
      if (!text) return true;
      // Simple heuristic: if contains only ASCII letters, numbers, and common punctuation, treat as English
      return /^[A-Za-z\d\s.,'"()\-!?:;]+$/.test(text);
    };

    let finalProduct = product;

    console.log(
      `[PhotoID] ✅ Found via text search — "${finalProduct.product_name}" (${finalProduct.brands}) code=${finalProduct.code} [${elapsed()}]`,
    );

    const existingProduct = await findByBarcode(finalProduct.code);
    if (existingProduct) {
      // Web search found richer data than what's in DB — update DB product
      if (hasNutritionData(finalProduct) && !hasNutritionData(existingProduct)) {
        console.log(
          `[PhotoID] 📝 DB product lacks nutrition — updating with web search data — code=${finalProduct.code} [${elapsed()}]`,
        );
        const updated = await createProduct(finalProduct);
        return {
          product: updated,
          shouldUploadPhoto: !hasValidImage(updated),
          source: 'websearch',
        };
      }

      console.log(
        `[PhotoID] ♻️ WebSearch resolved to existing DB product — code=${finalProduct.code} name="${existingProduct.product_name}" [${elapsed()}]`,
      );
      return {
        product: existingProduct,
        shouldUploadPhoto: !hasValidImage(existingProduct),
        source: 'websearch',
      };
    }

    return {
      product: finalProduct,
      shouldUploadPhoto: true,
      source: 'websearch',
    };
  } catch (error) {
    console.error(
      `[PhotoID] ❌ Uncaught error [${elapsed()}]:`,
      error instanceof Error ? `${error.message}\n${error.stack}` : error,
    );
    return null;
  }
};
