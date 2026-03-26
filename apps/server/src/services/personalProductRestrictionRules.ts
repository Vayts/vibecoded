import type { BarcodeLookupProduct, OnboardingResponse } from '@acme/shared';
import { RESTRICTION_RULE_TOKENS } from './restrictionTokens';

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
  tokens: readonly string[];
  excludePatterns: readonly RegExp[];
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

const RESTRICTION_RULES: Partial<
  Record<OnboardingResponse['restrictions'][number], RestrictionRule>
> = {
  VEGAN: {
    label: 'Vegan diet',
    description: 'Contains animal-derived ingredients or meat that conflict with your vegan diet',
    overview:
      'This product directly breaks your vegan diet, so the personal fit score is forced to 0.',
    ...RESTRICTION_RULE_TOKENS.VEGAN,
    forceZero: true,
  },
  VEGETARIAN: {
    label: 'Vegetarian diet',
    description: 'Contains meat or seafood that conflict with your vegetarian diet',
    overview:
      'This product directly breaks your vegetarian diet, so the personal fit score is forced to 0.',
    ...RESTRICTION_RULE_TOKENS.VEGETARIAN,
    forceZero: true,
  },
  GLUTEN_FREE: {
    label: 'Gluten-free diet',
    description: 'Contains gluten sources that conflict with your gluten-free diet',
    overview:
      'This product directly breaks your gluten-free diet, so the personal fit score is forced to 0.',
    ...RESTRICTION_RULE_TOKENS.GLUTEN_FREE,
    forceZero: true,
  },
  DAIRY_FREE: {
    label: 'Dairy-free diet',
    description: 'Contains dairy ingredients that conflict with your dairy-free diet',
    overview:
      'This product directly breaks your dairy-free diet, so the personal fit score is forced to 0.',
    ...RESTRICTION_RULE_TOKENS.DAIRY_FREE,
    forceZero: true,
  },
  NUT_FREE: {
    label: 'Nut-free diet',
    description: 'Contains nuts that conflict with your nut-free diet',
    overview:
      'This product directly breaks your nut-free diet, so the personal fit score is forced to 0.',
    ...RESTRICTION_RULE_TOKENS.NUT_FREE,
    forceZero: true,
  },
  HALAL: {
    label: 'Halal diet',
    description: 'Contains ingredients that directly conflict with your halal diet',
    overview:
      'This product directly breaks your halal diet, so the personal fit score is forced to 0.',
    ...RESTRICTION_RULE_TOKENS.HALAL,
    forceZero: true,
  },
  KOSHER: {
    label: 'Kosher diet',
    description: 'Contains ingredients that directly conflict with your kosher diet',
    overview:
      'This product directly breaks your kosher diet, so the personal fit score is forced to 0.',
    ...RESTRICTION_RULE_TOKENS.KOSHER,
    forceZero: true,
  },
};

export const getRestrictionSearchPool = (product: BarcodeLookupProduct): string[] => {
  return [
    ...(product.ingredients ?? []),
    ...(product.allergens ?? []),
    ...(product.additives ?? []),
    product.ingredients_text ?? '',
    product.product_name ?? '',
    product.brands ?? '',
    ...(product.category_tags ?? []),
    product.categories ?? '',
  ]
    .map((value) => value.toLowerCase())
    .filter(Boolean);
};

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const HAS_NON_ASCII = /[^\u0000-\u007F]/;

/**
 * Build a matcher for a single token.
 * ASCII tokens use \b word boundaries.
 * Non-ASCII tokens (Cyrillic, accented, etc.) use simple substring `.includes()`
 * because JS \b only recognises [a-zA-Z0-9_] as word characters.
 */
const buildMatcher = (token: string): ((value: string) => boolean) => {
  if (HAS_NON_ASCII.test(token)) {
    const lower = token.toLowerCase();
    return (value: string) => value.includes(lower);
  }
  const pattern = new RegExp(`\\b${escapeRegExp(token)}s?\\b`, 'i');
  return (value: string) => pattern.test(value);
};

export const hasAnyToken = (values: string[], tokens: readonly string[]): boolean => {
  const matchers = tokens.map(buildMatcher);
  return values.some((value) => matchers.some((m) => m(value)));
};

const hasAnyTokenWithExclusions = (
  values: string[],
  tokens: readonly string[],
  excludePatterns: readonly RegExp[],
): boolean => {
  const matchers = tokens.map(buildMatcher);
  return values.some(
    (value) =>
      matchers.some((m) => m(value)) && !excludePatterns.some((ex) => ex.test(value)),
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
