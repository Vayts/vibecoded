import type {
  NegativeProductAnalysisItem,
  PositiveProductAnalysisItem,
  ProductAnalysisItem,
} from '@acme/shared';

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
