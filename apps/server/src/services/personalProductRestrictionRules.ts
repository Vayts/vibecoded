import type { BarcodeLookupProduct, OnboardingResponse } from '@acme/shared';

interface RestrictionConflict {
  key: string;
  label: string;
  description: string;
  overview: string;
  severity: 'warning' | 'bad';
  forceZero: boolean;
}

interface RestrictionRule {
  label: string;
  description: string;
  overview: string;
  tokens: string[];
  excludePatterns: RegExp[];
  forceZero: boolean;
}

interface RestrictionCompatibleLabel {
  label: string;
  description: string;
  overview: string;
}

export const RESTRICTION_COMPATIBLE_LABELS: Partial<
  Record<OnboardingResponse['restrictions'][number], RestrictionCompatibleLabel>
> = {
  VEGAN: {
    label: 'Vegan compatible',
    description: 'No animal-derived ingredients detected',
    overview: 'This product appears fully compatible with your vegan diet.',
  },
  VEGETARIAN: {
    label: 'Vegetarian compatible',
    description: 'No meat or seafood ingredients detected',
    overview: 'This product appears fully compatible with your vegetarian diet.',
  },
  DAIRY_FREE: {
    label: 'Dairy-free compatible',
    description: 'No dairy ingredients detected',
    overview: 'This product appears fully compatible with your dairy-free diet.',
  },
  HALAL: {
    label: 'Halal compatible',
    description: 'No haram ingredients detected',
    overview: 'This product appears compatible with your halal diet.',
  },
  KOSHER: {
    label: 'Kosher compatible',
    description: 'No non-kosher ingredients detected',
    overview: 'This product appears compatible with your kosher diet.',
  },
};

const PLANT_BASED_DAIRY_EXCLUDE = [
  /\b(?:cocoa|shea|peanut|almond|cashew|mango|avocado|kokum|sal)\s+butter/i,
  /\b(?:coconut|almond|oat|soy|rice|hemp|cashew|hazelnut)\s+(?:milk|cream|yogurt|cheese)/i,
  /\bbutterscotch\b/i,
];

const RESTRICTION_RULES: Partial<
  Record<OnboardingResponse['restrictions'][number], RestrictionRule>
> = {
  VEGAN: {
    label: 'Vegan diet',
    description: 'Contains animal-derived ingredients or meat that conflict with your vegan diet',
    overview:
      'This product directly breaks your vegan diet, so the personal fit score is forced to 0.',
    tokens: [
      'meat',
      'beef',
      'chicken',
      'pork',
      'fish',
      'tuna',
      'salmon',
      'shellfish',
      'shrimp',
      'crab',
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
    ],
    excludePatterns: PLANT_BASED_DAIRY_EXCLUDE,
    forceZero: true,
  },
  VEGETARIAN: {
    label: 'Vegetarian diet',
    description: 'Contains meat or seafood that conflict with your vegetarian diet',
    overview:
      'This product directly breaks your vegetarian diet, so the personal fit score is forced to 0.',
    tokens: [
      'meat',
      'beef',
      'chicken',
      'pork',
      'fish',
      'tuna',
      'salmon',
      'shellfish',
      'shrimp',
      'crab',
      'gelatin',
    ],
    excludePatterns: [],
    forceZero: true,
  },
  GLUTEN_FREE: {
    label: 'Gluten-free diet',
    description: 'Contains gluten sources that conflict with your gluten-free diet',
    overview:
      'This product directly breaks your gluten-free diet, so the personal fit score is forced to 0.',
    tokens: ['gluten', 'wheat', 'barley', 'rye'],
    excludePatterns: [],
    forceZero: true,
  },
  DAIRY_FREE: {
    label: 'Dairy-free diet',
    description: 'Contains dairy ingredients that conflict with your dairy-free diet',
    overview:
      'This product directly breaks your dairy-free diet, so the personal fit score is forced to 0.',
    tokens: ['dairy', 'milk', 'whey', 'butter', 'cheese', 'cream', 'yogurt'],
    excludePatterns: PLANT_BASED_DAIRY_EXCLUDE,
    forceZero: true,
  },
  NUT_FREE: {
    label: 'Nut-free diet',
    description: 'Contains nuts that conflict with your nut-free diet',
    overview:
      'This product directly breaks your nut-free diet, so the personal fit score is forced to 0.',
    tokens: ['peanut', 'tree nut', 'hazelnut', 'almond', 'walnut', 'cashew', 'pistachio', 'nut'],
    excludePatterns: [],
    forceZero: true,
  },
  HALAL: {
    label: 'Halal diet',
    description: 'Contains ingredients that directly conflict with your halal diet',
    overview:
      'This product directly breaks your halal diet, so the personal fit score is forced to 0.',
    tokens: ['pork', 'bacon', 'ham', 'lard', 'wine', 'beer', 'rum', 'alcohol'],
    excludePatterns: [],
    forceZero: true,
  },
  KOSHER: {
    label: 'Kosher diet',
    description: 'Contains ingredients that directly conflict with your kosher diet',
    overview:
      'This product directly breaks your kosher diet, so the personal fit score is forced to 0.',
    tokens: ['pork', 'bacon', 'ham', 'shellfish', 'shrimp', 'crab', 'lobster'],
    excludePatterns: [],
    forceZero: true,
  },
};

export const getRestrictionSearchPool = (product: BarcodeLookupProduct): string[] => {
  return [
    ...(product.ingredients ?? []),
    ...(product.allergens ?? []),
    ...(product.additives ?? []),
    product.ingredients_text ?? '',
  ]
    .map((value) => value.toLowerCase())
    .filter(Boolean);
};

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const hasAnyToken = (values: string[], tokens: string[]): boolean => {
  const patterns = tokens.map((t) => new RegExp(`\\b${escapeRegExp(t)}s?\\b`, 'i'));
  return values.some((value) => patterns.some((pattern) => pattern.test(value)));
};

const hasAnyTokenWithExclusions = (
  values: string[],
  tokens: string[],
  excludePatterns: RegExp[],
): boolean => {
  const patterns = tokens.map((t) => new RegExp(`\\b${escapeRegExp(t)}s?\\b`, 'i'));
  return values.some(
    (value) =>
      patterns.some((pattern) => pattern.test(value)) &&
      !excludePatterns.some((ex) => ex.test(value)),
  );
};

export const getRestrictionConflict = (
  restriction: OnboardingResponse['restrictions'][number],
  searchPool: string[],
): RestrictionConflict | null => {
  const rule = RESTRICTION_RULES[restriction];

  if (!rule || !hasAnyTokenWithExclusions(searchPool, rule.tokens, rule.excludePatterns)) {
    return null;
  }

  return {
    key: `restriction-${restriction.toLowerCase()}`,
    label: rule.label,
    description: rule.description,
    overview: rule.overview,
    severity: rule.forceZero ? 'bad' : 'warning',
    forceZero: rule.forceZero,
  };
};
