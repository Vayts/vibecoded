import type { BarcodeLookupProduct } from '@acme/shared';

/**
 * Extracts a clean ingredient list from normalized product data.
 *
 * Priority:
 * 1. Use `ingredients[]` array if present and non-empty
 * 2. Fallback to parsing `ingredients_text` string
 * 3. Return null if neither exists
 */
export const extractIngredients = (
  product: BarcodeLookupProduct,
): { original: string; raw: string }[] | null => {
  if (product.ingredients.length > 0) {
    const cleaned = product.ingredients
      .map((i) => i.trim())
      .filter((i) => i.length > 0)
      .map((i) => ({ original: i, raw: i }));
    return cleaned.length > 0 ? cleaned : null;
  }

  if (product.ingredients_text && product.ingredients_text.trim().length > 0) {
    const parsed = product.ingredients_text
      .split(/[,;]/)
      .map((i) => i.trim())
      .filter((i) => i.length > 0)
      .map((i) => ({ original: i, raw: i }));
    return parsed.length > 0 ? parsed : null;
  }

  return null;
};
