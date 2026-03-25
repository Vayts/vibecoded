import type {
  NegativeProductAnalysisItem,
  PositiveProductAnalysisItem,
  ProductAnalysisItem,
} from '@acme/shared';

export const allergyTokens: Record<string, string[]> = {
  PEANUTS: ['peanut'],
  TREE_NUTS: ['tree nut', 'hazelnut', 'almond', 'walnut', 'cashew', 'pistachio', 'nut'],
  GLUTEN: ['gluten', 'wheat', 'barley', 'rye'],
  DAIRY: ['dairy', 'milk', 'whey', 'butter', 'cheese', 'cream', 'yogurt'],
  SOY: ['soy'],
  EGGS: ['egg'],
  SHELLFISH: ['shellfish', 'shrimp', 'prawn', 'crab'],
  SESAME: ['sesame'],
};

export const allergyLabels: Record<string, string> = {
  PEANUTS: 'Peanuts',
  TREE_NUTS: 'Tree nuts',
  GLUTEN: 'Gluten',
  DAIRY: 'Dairy',
  SOY: 'Soy',
  EGGS: 'Eggs',
  SHELLFISH: 'Shellfish',
  SESAME: 'Sesame',
  OTHER: 'Other allergen',
};

const MAX_VISIBLE_PERSONAL_REASONS = 4;
const VISIBLE_PERSONAL_POSITIVE_KEYS = new Set([
  'protein',
  'fiber',
  'sugar',
  'salt',
  'saturated-fat',
  'goal',
  'dietary-preference',
]);
const VISIBLE_PERSONAL_NEGATIVE_KEY_PREFIXES = [
  'sugar',
  'salt',
  'saturated-fat',
  'calories',
  'additives',
  'allergy-',
  'trace-',
  'restriction-',
  'nutriscore',
  'ingredients',
];

const isVisiblePersonalPositive = (item: ProductAnalysisItem): boolean => {
  return VISIBLE_PERSONAL_POSITIVE_KEYS.has(item.key);
};

const isVisiblePersonalNegative = (item: ProductAnalysisItem): boolean => {
  return VISIBLE_PERSONAL_NEGATIVE_KEY_PREFIXES.some((prefix) => item.key.startsWith(prefix));
};

export const limitVisiblePersonalPositives = (
  items: PositiveProductAnalysisItem[],
): PositiveProductAnalysisItem[] => {
  return items.filter(isVisiblePersonalPositive).slice(0, MAX_VISIBLE_PERSONAL_REASONS);
};

export const limitVisiblePersonalNegatives = (
  items: NegativeProductAnalysisItem[],
): NegativeProductAnalysisItem[] => {
  return items.filter(isVisiblePersonalNegative).slice(0, MAX_VISIBLE_PERSONAL_REASONS);
};