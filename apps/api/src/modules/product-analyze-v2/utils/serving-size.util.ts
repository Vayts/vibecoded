interface ParsedServingSize {
  grams: number | null;
  ml: number | null;
}

const GRAM_PATTERN = /(\d+(?:\.\d+)?)\s*g(?:rams?)?\b/i;
const ML_PATTERN = /(\d+(?:\.\d+)?)\s*(?:ml|mL|milliliters?)\b/i;
const OZ_TO_G = 28.3495;
const OZ_PATTERN = /(\d+(?:\.\d+)?)\s*oz\b/i;

export function parseServingSize(servingSizeText: string | null): ParsedServingSize {
  if (!servingSizeText) return { grams: null, ml: null };

  const gramMatch = GRAM_PATTERN.exec(servingSizeText);
  const mlMatch = ML_PATTERN.exec(servingSizeText);
  const ozMatch = OZ_PATTERN.exec(servingSizeText);

  const grams = gramMatch
    ? parseFloat(gramMatch[1])
    : ozMatch
      ? Math.round(parseFloat(ozMatch[1]) * OZ_TO_G)
      : null;

  const ml = mlMatch ? parseFloat(mlMatch[1]) : null;

  return { grams, ml };
}

export function calculateCaloriesPerServing(
  caloriesPer100g: number | null,
  servingSizeGrams: number | null,
  servingSizeMl: number | null,
): number | null {
  if (caloriesPer100g === null) return null;

  const servingSize = servingSizeGrams ?? servingSizeMl;
  if (!servingSize || servingSize <= 0) return null;

  return Math.round((caloriesPer100g * servingSize) / 100);
}
