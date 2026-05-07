import type { NormalizedProductV2 } from '../types/normalized-product.types.js';

const STANDARD_OIL_SERVING_GRAMS = 14;

interface OilProfileFallback {
  saturatedFatPer100g: number;
}

const OIL_PROFILE_FALLBACKS: Array<{ keywords: string[]; values: OilProfileFallback }> = [
  { keywords: ['coconut'], values: { saturatedFatPer100g: 82 } },
  { keywords: ['palm'], values: { saturatedFatPer100g: 50 } },
  { keywords: ['avocado'], values: { saturatedFatPer100g: 12 } },
  { keywords: ['olive'], values: { saturatedFatPer100g: 14 } },
  { keywords: ['canola', 'rapeseed'], values: { saturatedFatPer100g: 7 } },
  { keywords: ['sunflower'], values: { saturatedFatPer100g: 10 } },
  { keywords: ['safflower'], values: { saturatedFatPer100g: 8 } },
  { keywords: ['flax', 'linseed'], values: { saturatedFatPer100g: 9 } },
  { keywords: ['walnut'], values: { saturatedFatPer100g: 9 } },
  { keywords: ['grapeseed'], values: { saturatedFatPer100g: 10 } },
  { keywords: ['sesame'], values: { saturatedFatPer100g: 14 } },
  { keywords: ['soybean', 'soy'], values: { saturatedFatPer100g: 15 } },
  { keywords: ['corn'], values: { saturatedFatPer100g: 13 } },
  { keywords: ['peanut'], values: { saturatedFatPer100g: 17 } },
  { keywords: ['rice bran'], values: { saturatedFatPer100g: 20 } },
];

const normalize = (value: string): string => value.trim().toLowerCase();

const matchesOilKeyword = (text: string, keywords: string[]): boolean => {
  const normalizedText = normalize(text);
  return keywords.some((keyword) => normalizedText.includes(keyword));
};

const resolveOilFallbackProfile = (product: NormalizedProductV2): OilProfileFallback | null => {
  const haystacks = [...product.ingredients, product.name ?? '', ...product.categories].map(
    normalize,
  );

  for (const profile of OIL_PROFILE_FALLBACKS) {
    if (haystacks.some((text) => matchesOilKeyword(text, profile.keywords))) {
      return profile.values;
    }
  }

  if (haystacks.some((text) => text.includes('oil'))) {
    return { saturatedFatPer100g: 16 };
  }

  return null;
};

export interface OilNutritionFallbackValues {
  fatPer100g: number | null;
  sugarPer100g: number | null;
  sodiumPer100g: number | null;
  saturatedFatPer100g: number | null;
  caloriesPerServing: number | null;
}

export function getOilNutritionFallbackValues(
  product: NormalizedProductV2,
): OilNutritionFallbackValues | null {
  if (product.additives.length > 0 || product.ingredients.length !== 1) {
    return null;
  }

  const ingredient = normalize(product.ingredients[0]);
  if (!ingredient.includes('oil')) {
    return null;
  }

  const profile = resolveOilFallbackProfile(product);
  if (!profile) {
    return null;
  }

  const fatPer100g =
    product.nutrition.fatPer100g ??
    (product.nutrition.caloriesPer100g !== null
      ? Math.max(0, Math.min(100, Math.round(product.nutrition.caloriesPer100g / 9)))
      : 100);

  const saturatedFatPer100g = product.nutrition.saturatedFatPer100g ?? profile.saturatedFatPer100g;

  return {
    fatPer100g,
    sugarPer100g: product.nutrition.sugarPer100g ?? 0,
    sodiumPer100g: product.nutrition.sodiumPer100g ?? 0,
    saturatedFatPer100g,
    caloriesPerServing:
      product.nutrition.caloriesPerServing ??
      (product.nutrition.caloriesPer100g !== null
        ? Math.round((product.nutrition.caloriesPer100g * STANDARD_OIL_SERVING_GRAMS) / 100)
        : null),
  };
}
