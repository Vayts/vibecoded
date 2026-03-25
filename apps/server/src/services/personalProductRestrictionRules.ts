import type { OnboardingResponse } from '@acme/shared';

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
  forceZero: boolean;
}

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
    forceZero: true,
  },
  GLUTEN_FREE: {
    label: 'Gluten-free diet',
    description: 'Contains gluten sources that conflict with your gluten-free diet',
    overview:
      'This product directly breaks your gluten-free diet, so the personal fit score is forced to 0.',
    tokens: ['gluten', 'wheat', 'barley', 'rye'],
    forceZero: true,
  },
  DAIRY_FREE: {
    label: 'Dairy-free diet',
    description: 'Contains dairy ingredients that conflict with your dairy-free diet',
    overview:
      'This product directly breaks your dairy-free diet, so the personal fit score is forced to 0.',
    tokens: ['dairy', 'milk', 'whey', 'butter', 'cheese', 'cream', 'yogurt'],
    forceZero: true,
  },
  NUT_FREE: {
    label: 'Nut-free diet',
    description: 'Contains nuts that conflict with your nut-free diet',
    overview:
      'This product directly breaks your nut-free diet, so the personal fit score is forced to 0.',
    tokens: ['peanut', 'tree nut', 'hazelnut', 'almond', 'walnut', 'cashew', 'pistachio', 'nut'],
    forceZero: true,
  },
  HALAL: {
    label: 'Halal diet',
    description: 'Contains ingredients that directly conflict with your halal diet',
    overview:
      'This product directly breaks your halal diet, so the personal fit score is forced to 0.',
    tokens: ['pork', 'bacon', 'ham', 'lard', 'wine', 'beer', 'rum', 'alcohol'],
    forceZero: true,
  },
  KOSHER: {
    label: 'Kosher diet',
    description: 'Contains ingredients that directly conflict with your kosher diet',
    overview:
      'This product directly breaks your kosher diet, so the personal fit score is forced to 0.',
    tokens: ['pork', 'bacon', 'ham', 'shellfish', 'shrimp', 'crab', 'lobster'],
    forceZero: true,
  },
};

const hasAnyToken = (values: string[], tokens: string[]): boolean => {
  return values.some((value) => tokens.some((token) => value.includes(token)));
};

export const getRestrictionConflict = (
  restriction: OnboardingResponse['restrictions'][number],
  searchPool: string[],
): RestrictionConflict | null => {
  const rule = RESTRICTION_RULES[restriction];

  if (!rule || !hasAnyToken(searchPool, rule.tokens)) {
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
