import type { ComparisonProductKey } from '@acme/shared';
import type { ComparedProduct } from '../../utils/profileCompareTypes';

export type ComparisonStatusIndicator = 'positive' | 'negative' | 'neutral';

export interface ComparisonDisplayNutritionRow {
  comparisonMark: '<' | '>' | '=' | null;
  iconKey: string | null;
  kind: 'metric' | 'score' | 'status';
  key: string;
  label: string;
  leftStatus?: ComparisonStatusIndicator;
  leftValue: string | number;
  rightStatus?: ComparisonStatusIndicator;
  rightValue: string | number;
  winner: ComparisonProductKey | 'tie' | null;
}

interface NutritionMetric {
  direction: 'higher_better' | 'lower_better';
  iconKey: string;
  key: keyof ComparedProduct['product']['nutrition'];
  label: string;
  unit: string;
}

interface ScoreMetric {
  key: 'safety' | 'goal-fit' | 'nutrition-fit';
  label: string;
  getValue: (product: ComparedProduct) => number | null;
}

const NUTRITION_METRICS: NutritionMetric[] = [
  {
    key: 'caloriesPer100g',
    label: 'Calories',
    unit: 'kcal',
    iconKey: 'calories',
    direction: 'lower_better',
  },
  { key: 'sugarPer100g', label: 'Sugar', unit: 'g', iconKey: 'sugar', direction: 'lower_better' },
  { key: 'fatPer100g', label: 'Fat', unit: 'g', iconKey: 'fat', direction: 'lower_better' },
  {
    key: 'saturatedFatPer100g',
    label: 'Saturated fat',
    unit: 'g',
    iconKey: 'saturated-fat',
    direction: 'lower_better',
  },
  { key: 'sodiumPer100g', label: 'Sodium', unit: 'g', iconKey: 'salt', direction: 'lower_better' },
  { key: 'fiberPer100g', label: 'Fiber', unit: 'g', iconKey: 'fiber', direction: 'higher_better' },
  {
    key: 'proteinPer100g',
    label: 'Protein',
    unit: 'g',
    iconKey: 'protein',
    direction: 'higher_better',
  },
];

const SCORE_METRICS: ScoreMetric[] = [
  {
    key: 'safety',
    label: 'Safety fit',
    getValue: (product) => product.analysis.safety?.score ?? null,
  },
  {
    key: 'goal-fit',
    label: 'Goal fit',
    getValue: (product) => product.analysis.goalFit?.score ?? null,
  },
  {
    key: 'nutrition-fit',
    label: 'Nutrition fit',
    getValue: (product) => product.analysis.nutrition?.score ?? null,
  },
];

const formatNumericValue = (value: number, unit: string): string => {
  const formattedValue = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return unit.toLowerCase() === 'kcal' ? `${formattedValue} kcal` : `${formattedValue}${unit}`;
};

const normalizeComparableValue = (value: number): number => {
  return Number.isInteger(value) ? value : Number(value.toFixed(1));
};

const getComparisonMark = (
  leftValue: number | null,
  rightValue: number | null,
): ComparisonDisplayNutritionRow['comparisonMark'] => {
  if (leftValue == null || rightValue == null) return null;
  const normalizedLeftValue = normalizeComparableValue(leftValue);
  const normalizedRightValue = normalizeComparableValue(rightValue);

  if (normalizedLeftValue === normalizedRightValue) return '=' as const;
  return normalizedLeftValue > normalizedRightValue ? '>' : '<';
};

const getMetricWinner = (
  metric: NutritionMetric,
  leftValue: number | null,
  rightValue: number | null,
): ComparisonProductKey | 'tie' | null => {
  if (leftValue == null || rightValue == null) return null;
  const normalizedLeftValue = normalizeComparableValue(leftValue);
  const normalizedRightValue = normalizeComparableValue(rightValue);

  if (normalizedLeftValue === normalizedRightValue) return 'tie';
  if (metric.direction === 'higher_better') {
    return normalizedLeftValue > normalizedRightValue ? 'product1' : 'product2';
  }

  return normalizedLeftValue < normalizedRightValue ? 'product1' : 'product2';
};

const getProfileFitStatus = (product: ComparedProduct): ComparisonStatusIndicator => {
  const matchedAllergens = product.analysis.safety?.matchedAllergens?.length ?? 0;
  const violatedRestrictions = product.analysis.safety?.violatedRestrictions?.length ?? 0;
  const safetyStatus = product.analysis.safety?.status;

  if (safetyStatus === 'avoid' || matchedAllergens > 0 || violatedRestrictions > 0)
    return 'negative';
  if (safetyStatus === 'safe') return 'positive';
  return 'neutral';
};

export const getDisplayNutritionRows = (
  leftProduct: ComparedProduct,
  rightProduct: ComparedProduct,
): ComparisonDisplayNutritionRow[] => {
  const scoreRows = SCORE_METRICS.map((metric) => {
    const leftValue = metric.getValue(leftProduct);
    const rightValue = metric.getValue(rightProduct);

    return {
      comparisonMark: getComparisonMark(leftValue, rightValue),
      iconKey: null,
      key: metric.key,
      kind: 'score' as const,
      label: metric.label,
      leftValue: leftValue == null ? '—' : leftValue,
      rightValue: rightValue == null ? '—' : rightValue,
      winner: getMetricWinner(
        {
          key: 'proteinPer100g',
          label: metric.label,
          unit: '',
          iconKey: '',
          direction: 'higher_better',
        },
        leftValue,
        rightValue,
      ),
    };
  }).filter((row) => row.leftValue !== '—' || row.rightValue !== '—');

  const metricRows = NUTRITION_METRICS.map((metric) => {
    const leftValue = leftProduct.product.nutrition?.[metric.key] ?? null;
    const rightValue = rightProduct.product.nutrition?.[metric.key] ?? null;

    return {
      comparisonMark: getComparisonMark(leftValue, rightValue),
      iconKey: metric.iconKey,
      key: String(metric.key),
      kind: 'metric' as const,
      label: metric.label,
      leftValue: leftValue == null ? '—' : formatNumericValue(leftValue, metric.unit),
      rightValue: rightValue == null ? '—' : formatNumericValue(rightValue, metric.unit),
      winner: getMetricWinner(metric, leftValue, rightValue),
    };
  }).filter((row) => row.leftValue !== '—' || row.rightValue !== '—');

  return [
    ...scoreRows,
    ...metricRows,
    {
      comparisonMark: null,
      iconKey: 'diet-match',
      key: 'profile-fit',
      kind: 'status' as const,
      label: 'Profile fit',
      leftStatus: getProfileFitStatus(leftProduct),
      leftValue: '',
      rightStatus: getProfileFitStatus(rightProduct),
      rightValue: '',
      winner: null,
    },
  ];
};
