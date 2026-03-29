import type {
  NegativeProductAnalysisItem,
  PositiveProductAnalysisItem,
  ProductAnalysisItem,
} from '@acme/shared';

const MAX_VISIBLE_PERSONAL_REASONS = 6;
const VISIBLE_PERSONAL_POSITIVE_KEYS = new Set([
  'protein',
  'fiber',
  'sugar',
  'salt',
  'saturated-fat',
  'calories',
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

const VISIBLE_PERSONAL_POSITIVE_PREFIXES = ['restriction-'];

const isVisiblePersonalPositive = (item: ProductAnalysisItem): boolean => {
  return (
    VISIBLE_PERSONAL_POSITIVE_KEYS.has(item.key) ||
    VISIBLE_PERSONAL_POSITIVE_PREFIXES.some((prefix) => item.key.startsWith(prefix))
  );
};

const isVisiblePersonalNegative = (item: ProductAnalysisItem): boolean => {
  return VISIBLE_PERSONAL_NEGATIVE_KEY_PREFIXES.some((prefix) => item.key.startsWith(prefix));
};

/** Sort nutrition items first, then restrictions/diet/ingredients. */
const sortByCategory = <T extends ProductAnalysisItem>(items: T[]): T[] => {
  const order: Record<string, number> = { nutrition: 0, ingredients: 1, diet: 2, restriction: 3 };
  return [...items].sort(
    (a, b) => (order[a.category] ?? 9) - (order[b.category] ?? 9),
  );
};

export const limitVisiblePersonalPositives = (
  items: PositiveProductAnalysisItem[],
): PositiveProductAnalysisItem[] => {
  return sortByCategory(items.filter(isVisiblePersonalPositive)).slice(
    0,
    MAX_VISIBLE_PERSONAL_REASONS,
  );
};

export const limitVisiblePersonalNegatives = (
  items: NegativeProductAnalysisItem[],
): NegativeProductAnalysisItem[] => {
  return sortByCategory(items.filter(isVisiblePersonalNegative)).slice(
    0,
    MAX_VISIBLE_PERSONAL_REASONS,
  );
};
