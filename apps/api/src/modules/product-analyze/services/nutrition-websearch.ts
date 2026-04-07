import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import type { NutritionFacts } from '@acme/shared';

import { AI_MODELS } from '../constants/models';

// Schema for nutrition-only web search result
const nutritionSearchResultSchema = z.object({
  found: z.boolean().describe('Whether reliable nutrition data was found'),
  source: z
    .string()
    .nullable()
    .describe(
      'Source of the data (e.g. "OpenFoodFacts", "manufacturer website")',
    ),
  nutrition: z
    .object({
      energy_kcal_100g: z.number().nullable(),
      proteins_100g: z.number().nullable(),
      fat_100g: z.number().nullable(),
      saturated_fat_100g: z.number().nullable(),
      carbohydrates_100g: z.number().nullable(),
      sugars_100g: z.number().nullable(),
      fiber_100g: z.number().nullable(),
      salt_100g: z.number().nullable(),
      sodium_100g: z.number().nullable(),
    })
    .nullable(),
});

const NUTRITION_SEARCH_PROMPT = `You are a nutrition data researcher. Given a product name and brand, search the web to find its NUTRITION FACTS per 100g.

SEARCH STRATEGY:
1. Search: "[product name] [brand] nutrition facts per 100g"
2. Search: "site:openfoodfacts.org [product name] [brand]"
3. Search: "[product name] [brand] пищевая ценность на 100г" (for Russian/Ukrainian products)
4. Try manufacturer website or major retailers if needed.

CRITICAL — PER 100g ONLY:
- ALL nutrition values MUST be per 100g (or per 100ml for liquids). NOT per serving, NOT per package, NOT per 1kg.
- Many websites show nutrition per serving (e.g. per 30g, per piece, per cup). You MUST convert to per 100g.
  Example: if a website says "protein: 2.5g per 30g serving", the per-100g value is 2.5 / 30 * 100 = 8.3g.
  Example: if a website shows values per 1kg, divide by 10.
- VERIFY: carbs + protein + fat should roughly sum to less than 100g. If they sum to more than 100, you likely have wrong units.
- VERIFY: calories for a non-fat product should not exceed 400 kcal/100g. Pure fat/oil maxes at ~900 kcal/100g.

RULES:
- Round to 1 decimal place. Calories to nearest integer.
- If a value is not available, set to null. NEVER use 0 as placeholder.
- Use the SAME source for ALL values — do not mix sources.
- Prefer data from: OpenFoodFacts > manufacturer > major retailers > FatSecret > USDA.
- If no reliable source is found, return found: false.
- Do NOT fabricate or guess values.`;

const roundTo1 = (v: number | null | undefined): number | null =>
  v != null ? Math.round(v * 10) / 10 : null;

// Per-100g sanity bounds: if a value exceeds the max, it's likely per-kg or per-serving-of-wrong-unit
const PER_100G_MAX: Record<string, number> = {
  energy_kcal_100g: 900, // pure fat is ~900 kcal/100g
  proteins_100g: 100,
  fat_100g: 100,
  saturated_fat_100g: 100,
  carbohydrates_100g: 100,
  sugars_100g: 100,
  fiber_100g: 100,
  salt_100g: 100,
  sodium_100g: 40, // 100g salt ≈ 39g sodium
};

/**
 * Detect if the AI returned values per-kg (or per-serving > 100g) and scale down.
 * Heuristic: if 3+ macro values exceed per-100g maximums by ~10x, divide all by 10.
 */
function sanitizeNutritionValues(
  raw: Record<string, number | null>,
): Record<string, number | null> {
  const keys = Object.keys(PER_100G_MAX);
  let overCount = 0;
  for (const k of keys) {
    const v = raw[k];
    if (v != null && v > (PER_100G_MAX[k] ?? Infinity)) {
      overCount++;
    }
  }

  // If 3+ values exceed maxes, likely per-kg → divide by 10
  if (overCount >= 3) {
    console.log(
      `[NutritionSearch] ⚠️ Detected ${overCount} over-max values — scaling down by 10x (likely per-kg)`,
    );
    const fixed: Record<string, number | null> = {};
    for (const k of keys) {
      const v = raw[k];
      fixed[k] = v != null ? v / 10 : null;
    }
    return fixed;
  }

  // Individual clamp: if a single value is over max, set to null (unreliable)
  const result: Record<string, number | null> = { ...raw };
  for (const k of keys) {
    const v = result[k];
    if (v != null && v > (PER_100G_MAX[k] ?? Infinity)) {
      console.log(
        `[NutritionSearch] ⚠️ ${k}=${v} exceeds max ${PER_100G_MAX[k]} — setting to null`,
      );
      result[k] = null;
    }
  }
  return result;
}

/**
 * Search the web for nutrition data of a product.
 * Returns NutritionFacts if found, null otherwise.
 */
export const searchNutritionData = async (
  productName: string,
  brand?: string | null,
  barcode?: string | null,
): Promise<NutritionFacts | null> => {
  if (!process.env.OPENAI_API_KEY) return null;

  const searchQuery = [productName, brand].filter(Boolean).join(' ');
  console.log(
    `[NutritionSearch] Starting web search for: "${searchQuery}" barcode=${barcode ?? 'none'}`,
  );
  const start = Date.now();

  try {
    const model = new ChatOpenAI({
      model: AI_MODELS.reason,
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 1,
      reasoning: { effort: 'low' },
    });

    const structuredModel = (model as any)
      .bindTools([{ type: 'web_search_preview', search_context_size: 'high' }])
      .withStructuredOutput(nutritionSearchResultSchema, {
        method: 'jsonSchema',
        name: 'nutrition_search',
      });

    const barcodeHint = barcode ? `\nBarcode: ${barcode}` : '';
    const result = await structuredModel.invoke([
      { role: 'system', content: NUTRITION_SEARCH_PROMPT },
      {
        role: 'user',
        content: `Find nutrition facts per 100g for:\nProduct: ${productName}\nBrand: ${brand ?? 'unknown'}${barcodeHint}`,
      },
    ]);

    const elapsed = Date.now() - start;

    if (!result.found || !result.nutrition) {
      console.log(`[NutritionSearch] Not found  ${elapsed}ms`);
      return null;
    }

    const raw = result.nutrition;
    const sane = sanitizeNutritionValues({
      energy_kcal_100g: raw.energy_kcal_100g,
      proteins_100g: raw.proteins_100g,
      fat_100g: raw.fat_100g,
      saturated_fat_100g: raw.saturated_fat_100g,
      carbohydrates_100g: raw.carbohydrates_100g,
      sugars_100g: raw.sugars_100g,
      fiber_100g: raw.fiber_100g,
      salt_100g: raw.salt_100g,
      sodium_100g: raw.sodium_100g,
    });

    const facts: NutritionFacts = {
      calories:
        sane.energy_kcal_100g != null
          ? Math.round(sane.energy_kcal_100g)
          : null,
      protein: roundTo1(sane.proteins_100g),
      fat: roundTo1(sane.fat_100g),
      saturatedFat: roundTo1(sane.saturated_fat_100g),
      carbs: roundTo1(sane.carbohydrates_100g),
      sugars: roundTo1(sane.sugars_100g),
      fiber: roundTo1(sane.fiber_100g),
      salt: roundTo1(sane.salt_100g),
      sodium: roundTo1(sane.sodium_100g),
    };

    // Validate we got at least calories + one macro
    const hasData =
      facts.calories != null &&
      (facts.protein != null || facts.fat != null || facts.carbs != null);
    if (!hasData) {
      console.log(
        `[NutritionSearch] Incomplete data, discarding  ${elapsed}ms`,
      );
      return null;
    }

    console.log(
      `[NutritionSearch] Found  source="${result.source}"  ` +
        `cal=${facts.calories} prot=${facts.protein} fat=${facts.fat} carbs=${facts.carbs}  ${elapsed}ms`,
    );
    return facts;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[NutritionSearch] Failed: ${msg}  ${Date.now() - start}ms`);
    return null;
  }
};
