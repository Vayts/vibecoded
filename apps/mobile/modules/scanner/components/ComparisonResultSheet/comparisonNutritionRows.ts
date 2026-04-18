import type {
  ComparisonNutrition,
  ComparisonNutritionRow,
  ComparisonProductKey,
  ProductComparisonResult,
  ProfileComparisonResult,
} from '@acme/shared';

export type ComparisonStatusIndicator = 'positive' | 'negative' | 'neutral';

export interface ComparisonDisplayNutritionRow {
  comparisonMark: '<' | '>' | '=' | null;
  iconKey: string | null;
  kind: 'metric' | 'status';
  key: string;
  label: string;
  leftStatus?: ComparisonStatusIndicator;
  leftValue: string;
  rightStatus?: ComparisonStatusIndicator;
  rightValue: string;
  winner: ComparisonProductKey | 'tie' | null;
}

interface FallbackMetric {
  direction: 'higher_better' | 'lower_better';
  iconKey: string;
  key: keyof ComparisonNutrition;
  label: string;
  unit: string;
}

const FALLBACK_NUTRITION_METRICS: FallbackMetric[] = [
  { key: 'sugars', label: 'Sugar', unit: 'g', iconKey: 'sugar', direction: 'lower_better' },
  { key: 'fat', label: 'Fat', unit: 'g', iconKey: 'fat', direction: 'lower_better' },
  { key: 'salt', label: 'Salt', unit: 'g', iconKey: 'salt', direction: 'lower_better' },
  { key: 'fiber', label: 'Fiber', unit: 'g', iconKey: 'fiber', direction: 'higher_better' },
  { key: 'protein', label: 'Protein', unit: 'g', iconKey: 'protein', direction: 'higher_better' },
];

const PROFILE_FIT_KEYWORD =
  /(allergen|allergy|gluten|dairy|lactose|nut|peanut|soy|egg|shellfish|sesame|vegan|vegetarian|halal|kosher|keto|paleo)/i;
const ALLERGEN_KEYWORD =
  /(allergen|allergy|gluten|dairy|lactose|nut|peanut|soy|egg|shellfish|sesame)/i;

const formatNumericValue = (value: number, unit: string): string => {
  const formattedValue = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return unit.toLowerCase() === 'kcal' ? `${formattedValue} kcal` : `${formattedValue}${unit}`;
};

const formatComparisonValue = (
  value: ComparisonNutritionRow['product1Value'],
  unit?: string | null,
): string => {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  return formatNumericValue(value, unit ?? '');
};

const toRowWinner = (
  winner: ComparisonNutritionRow['winner'],
): ComparisonDisplayNutritionRow['winner'] => {
  if (!winner || winner === 'none') return null;
  return winner;
};

const getComparisonMark = (
  leftValue: number | null,
  rightValue: number | null,
): ComparisonDisplayNutritionRow['comparisonMark'] => {
  if (leftValue == null || rightValue == null) return null;
  if (leftValue === rightValue) return '=' as const;
  return leftValue > rightValue ? '>' : '<';
};

const getMetricWinner = (
  metric: FallbackMetric,
  leftValue: number | null,
  rightValue: number | null,
): ComparisonProductKey | 'tie' | null => {
  if (leftValue == null || rightValue == null) return null;
  if (leftValue === rightValue) return 'tie';
  if (metric.direction === 'higher_better') return leftValue > rightValue ? 'product1' : 'product2';
  return leftValue < rightValue ? 'product1' : 'product2';
};

const hasCompatibilitySignal = (comparison: ProfileComparisonResult['product1']): boolean =>
  [...comparison.positives, ...comparison.negatives].some((text) => PROFILE_FIT_KEYWORD.test(text));

const getCompatibilityStatus = (
  comparison: ProfileComparisonResult['product1'],
  fallbackWinner: ProfileComparisonResult['winner'],
  side: ComparisonProductKey,
): ComparisonStatusIndicator => {
  if (comparison.negatives.some((text) => PROFILE_FIT_KEYWORD.test(text))) return 'negative';
  if (comparison.positives.some((text) => PROFILE_FIT_KEYWORD.test(text))) return 'positive';
  if (fallbackWinner === 'neither') return 'negative';
  if (fallbackWinner === side) return 'positive';
  return 'neutral';
};

const getFallbackRows = (
  profile: ProfileComparisonResult,
  result: ProductComparisonResult,
): ComparisonDisplayNutritionRow[] => [
  ...FALLBACK_NUTRITION_METRICS.map((metric) => {
    const leftMetricValue = result.product1.nutrition[metric.key] as number | null;
    const rightMetricValue = result.product2.nutrition[metric.key] as number | null;

    return {
      comparisonMark: getComparisonMark(leftMetricValue, rightMetricValue),
      iconKey: metric.iconKey,
      key: String(metric.key),
      kind: 'metric' as const,
      label: metric.label,
      leftValue: leftMetricValue == null ? '—' : formatNumericValue(leftMetricValue, metric.unit),
      rightValue: rightMetricValue == null ? '—' : formatNumericValue(rightMetricValue, metric.unit),
      winner: getMetricWinner(metric, leftMetricValue, rightMetricValue),
    };
  }).filter((row) => row.leftValue !== '—' || row.rightValue !== '—'),
  {
    comparisonMark: null,
    iconKey: hasCompatibilitySignal(profile.product1) || hasCompatibilitySignal(profile.product2)
      ? 'allergens'
      : 'diet-match',
    key: 'profile-fit',
    kind: 'status' as const,
    label:
      profile.product1.negatives.some((text) => ALLERGEN_KEYWORD.test(text)) ||
      profile.product2.negatives.some((text) => ALLERGEN_KEYWORD.test(text))
        ? 'Allergens'
        : 'Profile fit',
    leftStatus: getCompatibilityStatus(profile.product1, profile.winner, 'product1'),
    leftValue: '',
    rightStatus: getCompatibilityStatus(profile.product2, profile.winner, 'product2'),
    rightValue: '',
    winner: null,
  },
];

export const getDisplayNutritionRows = (
  profile: ProfileComparisonResult,
  result: ProductComparisonResult,
): ComparisonDisplayNutritionRow[] => {
  if (!profile.nutritionComparison?.length) {
    return getFallbackRows(profile, result);
  }

  return profile.nutritionComparison
    .map((row) => ({
      comparisonMark:
        typeof row.product1Value === 'number' && typeof row.product2Value === 'number'
          ? getComparisonMark(row.product1Value, row.product2Value)
          : null,
      iconKey: row.icon ?? row.key,
      kind:
        /allergen|profile|diet|fit|compat/i.test(`${row.key} ${row.label}`) &&
        typeof row.product1Value !== 'number' &&
        typeof row.product2Value !== 'number'
          ? ('status' as const)
          : ('metric' as const),
      key: row.key,
      label: row.label,
      leftStatus: undefined,
      leftValue: row.product1DisplayValue ?? formatComparisonValue(row.product1Value, row.unit),
      rightStatus: undefined,
      rightValue: row.product2DisplayValue ?? formatComparisonValue(row.product2Value, row.unit),
      winner: toRowWinner(row.winner),
    }))
    .filter((row) => row.leftValue !== '—' || row.rightValue !== '—');
};

const swapWinner = (
  winner: ComparisonDisplayNutritionRow['winner'],
): ComparisonDisplayNutritionRow['winner'] => {
  if (winner === 'product1') return 'product2';
  if (winner === 'product2') return 'product1';
  return winner;
};

const swapMark = (mark: ComparisonDisplayNutritionRow['comparisonMark']) => {
  if (mark === '>') return '<';
  if (mark === '<') return '>';
  return mark;
};

export const swapDisplayNutritionRows = (
  rows: ComparisonDisplayNutritionRow[],
): ComparisonDisplayNutritionRow[] =>
  rows.map((row) => ({
    ...row,
    comparisonMark: swapMark(row.comparisonMark),
    leftStatus: row.rightStatus,
    leftValue: row.rightValue,
    rightStatus: row.leftStatus,
    rightValue: row.leftValue,
    winner: swapWinner(row.winner),
  }));