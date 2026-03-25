import type { z } from 'zod';

import { photoIdentificationSchema } from './productPhotoLookupSchema';

export const getPhotoIdentificationPrompt = () => {
  return `Analyze this packaged product photo conservatively.

Decide whether it shows a packaged food or beverage product.
Only mark it as identifiable when the product identity is clear from the packaging.
If a barcode is visible, extract digits only.
Extract as many grounded clues as possible from the packaging itself:
- product name
- brand
- best category guess
- all clearly visible front-of-pack text snippets
- visible ingredients text if an ingredients panel is present
- visible allergen / may-contain text if present
- animal-product signals such as pork, bacon, ham, lard, shrimp, crab, lobster
- a strong web search query
Do not guess when the image is ambiguous.`;
};

export const getPhotoResearchPrompt = (
  identification: z.infer<typeof photoIdentificationSchema>,
) => {
  return `Use web search to identify this packaged food product and normalize it to the exact JSON shape below.

Be conservative:
- Prefer confidentlyIdentified=false if the product cannot be reliably matched.
- Do not invent nutrition values, ingredients, allergens, brand, categories, or images.
- Use null or [] when data is missing.
- Prefer Open Food Facts, manufacturer pages, and major retailer product pages.
- Use the visible packaging text as a hard grounding signal.
- Recover ingredients, allergens, traces, and category data whenever trustworthy sources provide them.
- If a Nutri-Score is available, set it both in product.nutriscore_grade and in product.scores.nutriscore_grade.
- Return JSON only, with no markdown fences.

Known clues from the image:
- Product name: ${identification.productName ?? 'unknown'}
- Brand: ${identification.brand ?? 'unknown'}
- Category guess: ${identification.categoryGuess ?? 'unknown'}
- Visible text: ${identification.visibleText.join(' | ') || 'unknown'}
- Visible ingredients text: ${identification.visibleIngredientsText ?? 'unknown'}
- Visible allergen text: ${identification.visibleAllergensText ?? 'unknown'}
- Animal-product signals: ${identification.animalProductSignals.join(', ') || 'none'}
- Search query: ${identification.searchQuery ?? 'unknown'}

Required JSON shape:
{
  "confidentlyIdentified": boolean,
  "confidence": number,
  "product": {
    "code": string | null,
    "product_name": string | null,
    "brands": string | null,
    "image_url": string | null,
    "ingredients_text": string | null,
    "nutriscore_grade": string | null,
    "categories": string | null,
    "quantity": string | null,
    "serving_size": string | null,
    "ingredients": string[],
    "allergens": string[],
    "additives": string[],
    "additives_count": number | null,
    "traces": string[],
    "countries": string[],
    "category_tags": string[],
    "images": {
      "front_url": string | null,
      "ingredients_url": string | null,
      "nutrition_url": string | null
    },
    "nutrition": {
      "energy_kcal_100g": number | null,
      "proteins_100g": number | null,
      "fat_100g": number | null,
      "saturated_fat_100g": number | null,
      "carbohydrates_100g": number | null,
      "sugars_100g": number | null,
      "fiber_100g": number | null,
      "salt_100g": number | null,
      "sodium_100g": number | null
    },
    "scores": {
      "nutriscore_grade": string | null,
      "nutriscore_score": number | null,
      "ecoscore_grade": string | null,
      "ecoscore_score": number | null
    }
  }
}`;
};