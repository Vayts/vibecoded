import type {
  NormalizedProduct,
  DietCompatibility,
  DietCompatibilityValue,
  DietCompatibilityReasons,
  DietKey,
} from '@acme/shared';

/**
 * Token lists for deterministic diet compatibility detection.
 * Used as fallback when AI is unavailable.
 */

const PLANT_BASED_EXCLUDE = [
  /\b(?:cocoa|shea|peanut|almond|cashew|mango|avocado|kokum|sal)[-\s]+butter/i,
  /\b(?:coconut|almond|oat|soy|rice|hemp|cashew|hazelnut)[-\s]+(?:milk|cream|yogurt|cheese)/i,
  /\bbutterscotch\b/i,
  /\b(?:peanut|nut|almond|cashew|hazelnut|coconut|sunflower|seed)[-]butter/i,
];

const VEGAN_TOKENS = [
  'meat',
  'beef',
  'chicken',
  'pork',
  'fish',
  'tuna',
  'salmon',
  'shellfish',
  'shrimp',
  'dairy',
  'milk',
  'whey',
  'butter',
  'cheese',
  'cream',
  'yogurt',
  'egg',
  'honey',
  'gelatin',
  'lard',
  'tallow',
  'bacon',
  'ham',
  'sausage',
  'turkey',
  'lamb',
  'duck',
  'collagen',
  'casein',
  'lactose',
];

const VEGETARIAN_TOKENS = [
  'meat',
  'beef',
  'chicken',
  'pork',
  'fish',
  'tuna',
  'salmon',
  'shellfish',
  'shrimp',
  'gelatin',
  'lard',
  'tallow',
  'bacon',
  'ham',
  'sausage',
  'turkey',
  'lamb',
  'duck',
  'collagen',
  'carmine',
];

const HALAL_TOKENS = [
  'pork',
  'bacon',
  'ham',
  'lard',
  'wine',
  'beer',
  'rum',
  'alcohol',
  'sausage',
  'salami',
  'prosciutto',
];

const KOSHER_TOKENS = [
  'pork',
  'bacon',
  'ham',
  'shellfish',
  'shrimp',
  'crab',
  'lobster',
  'lard',
  'sausage',
  'salami',
  'prosciutto',
];

const GLUTEN_FREE_TOKENS = [
  'wheat',
  'barley',
  'rye',
  'spelt',
  'semolina',
  'bulgur',
  'malt',
  'seitan',
  'farro',
  'durum',
  'gluten',
];

const DAIRY_FREE_TOKENS = [
  'milk',
  'cream',
  'butter',
  'cheese',
  'yogurt',
  'whey',
  'casein',
  'lactose',
  'dairy',
];

const NUT_FREE_TOKENS = [
  'peanut',
  'almond',
  'walnut',
  'cashew',
  'hazelnut',
  'pistachio',
  'macadamia',
  'pecan',
  'tree nut',
  'nut',
];

const escapeRegExp = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasToken = (
  searchPool: string[],
  tokens: string[],
  excludePatterns: RegExp[] = [],
): boolean => {
  return searchPool.some((text) => {
    const matchesToken = tokens.some((token) => {
      const pattern = new RegExp(`\\b${escapeRegExp(token)}s?\\b`, 'i');
      return pattern.test(text);
    });
    if (!matchesToken) return false;
    return !excludePatterns.some((ex) => ex.test(text));
  });
};

const getSearchPool = (product: NormalizedProduct): string[] => {
  return [
    ...product.ingredients,
    ...product.allergens,
    ...product.additives,
    product.ingredients_text ?? '',
    product.product_name ?? '',
    ...product.category_tags,
    product.categories ?? '',
  ]
    .map((v) => v.toLowerCase())
    .filter(Boolean);
};

const findMatchingToken = (
  searchPool: string[],
  tokens: string[],
  excludePatterns: RegExp[] = [],
): string | null => {
  for (const text of searchPool) {
    for (const token of tokens) {
      const pattern = new RegExp(`\\b${escapeRegExp(token)}s?\\b`, 'i');
      if (pattern.test(text) && !excludePatterns.some((ex) => ex.test(text))) {
        return token;
      }
    }
  }
  return null;
};

const detectSingleDiet = (
  searchPool: string[],
  tokens: string[],
  excludePatterns: RegExp[] = [],
): DietCompatibilityValue => {
  if (searchPool.length === 0) return 'unclear';
  if (hasToken(searchPool, tokens, excludePatterns)) return 'incompatible';
  return 'compatible';
};

interface DietDetectionResult {
  compatibility: DietCompatibility;
  reasons: DietCompatibilityReasons;
}

const DIET_TOKEN_MAP: Record<
  DietKey,
  { tokens: string[]; exclude?: RegExp[] }
> = {
  vegan: { tokens: VEGAN_TOKENS, exclude: PLANT_BASED_EXCLUDE },
  vegetarian: { tokens: VEGETARIAN_TOKENS },
  halal: { tokens: HALAL_TOKENS },
  kosher: { tokens: KOSHER_TOKENS },
  glutenFree: { tokens: GLUTEN_FREE_TOKENS },
  dairyFree: { tokens: DAIRY_FREE_TOKENS, exclude: PLANT_BASED_EXCLUDE },
  nutFree: { tokens: NUT_FREE_TOKENS },
};

/**
 * Deterministic diet compatibility detection from product data.
 * Returns "unclear" when there's insufficient ingredient data.
 * Also returns a short reason for incompatible/unclear diets.
 */
export const detectDietCompatibilityWithReasons = (
  product: NormalizedProduct,
): DietDetectionResult => {
  const pool = getSearchPool(product);
  const hasIngredients =
    product.ingredients.length > 0 || Boolean(product.ingredients_text);

  if (!hasIngredients) {
    const compatibility: DietCompatibility = {
      vegan: 'unclear',
      vegetarian: 'unclear',
      halal: 'unclear',
      kosher: 'unclear',
      glutenFree: 'unclear',
      dairyFree: 'unclear',
      nutFree: 'unclear',
    };
    const reasons: DietCompatibilityReasons = {
      vegan: 'Ingredients not available',
      vegetarian: 'Ingredients not available',
      halal: 'Ingredients not available',
      kosher: 'Ingredients not available',
      glutenFree: 'Ingredients not available',
      dairyFree: 'Ingredients not available',
      nutFree: 'Ingredients not available',
    };
    return { compatibility, reasons };
  }

  const compatibility = {} as DietCompatibility;
  const reasons = {} as DietCompatibilityReasons;

  for (const [key, { tokens, exclude }] of Object.entries(DIET_TOKEN_MAP) as [
    DietKey,
    { tokens: string[]; exclude?: RegExp[] },
  ][]) {
    compatibility[key] = detectSingleDiet(pool, tokens, exclude);
    if (compatibility[key] === 'incompatible') {
      const match = findMatchingToken(pool, tokens, exclude);
      reasons[key] = match ? `Contains ${match}` : null;
    } else if (compatibility[key] === 'unclear') {
      reasons[key] = 'Insufficient ingredient data';
    } else {
      reasons[key] = null;
    }
  }

  return { compatibility, reasons };
};

/**
 * @deprecated Use detectDietCompatibilityWithReasons instead.
 */
export const detectDietCompatibility = (
  product: NormalizedProduct,
): DietCompatibility => {
  return detectDietCompatibilityWithReasons(product).compatibility;
};
