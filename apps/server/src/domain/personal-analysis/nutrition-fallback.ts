import type {
  NormalizedProduct,
  PersonalAnalysisResult,
  PositiveProductAnalysisItem,
  NegativeProductAnalysisItem,
} from '@acme/shared';

type Severity = 'good' | 'neutral' | 'warning' | 'bad';

interface NutrientThreshold {
  key: string;
  label: string;
  getValue: (n: NormalizedProduct['nutrition']) => number | null;
  unit: string;
  /** Returns severity for the value. "neutral" items are skipped. */
  classify: (v: number) => Severity;
  descGood: string;
  descBad: string;
}

const THRESHOLDS: NutrientThreshold[] = [
  {
    key: 'calories',
    label: 'Calories',
    getValue: (n) => n.energy_kcal_100g,
    unit: 'kcal',
    classify: (v) => (v <= 150 ? 'good' : v <= 300 ? 'neutral' : v <= 500 ? 'warning' : 'bad'),
    descGood: 'Low calorie content',
    descBad: 'High calorie content',
  },
  {
    key: 'sugar',
    label: 'Sugar',
    getValue: (n) => n.sugars_100g,
    unit: 'g',
    classify: (v) => (v <= 5 ? 'good' : v <= 10 ? 'neutral' : v <= 15 ? 'warning' : 'bad'),
    descGood: 'Low sugar content',
    descBad: 'High sugar content',
  },
  {
    key: 'salt',
    label: 'Salt',
    getValue: (n) => n.salt_100g,
    unit: 'g',
    classify: (v) => (v <= 0.3 ? 'good' : v <= 1 ? 'neutral' : v <= 1.5 ? 'warning' : 'bad'),
    descGood: 'Low salt content',
    descBad: 'High salt content',
  },
  {
    key: 'saturated-fat',
    label: 'Saturated fat',
    getValue: (n) => n.saturated_fat_100g,
    unit: 'g',
    classify: (v) => (v <= 1.5 ? 'good' : v <= 3 ? 'neutral' : v <= 5 ? 'warning' : 'bad'),
    descGood: 'Low saturated fat',
    descBad: 'High saturated fat',
  },
  {
    key: 'protein',
    label: 'Protein',
    getValue: (n) => n.proteins_100g,
    unit: 'g',
    classify: (v) => (v >= 8 ? 'good' : v >= 5 ? 'neutral' : 'neutral'),
    descGood: 'Good protein content',
    descBad: 'Low protein content',
  },
  {
    key: 'fiber',
    label: 'Fiber',
    getValue: (n) => n.fiber_100g,
    unit: 'g',
    classify: (v) => (v >= 3 ? 'good' : 'neutral'),
    descGood: 'Good fiber content',
    descBad: 'Low fiber content',
  },
];

const BASE_ITEM = { per: '100g' as const, category: 'nutrition' as const, overview: '' };

/**
 * Build a deterministic nutrition-based fallback when the AI personal analysis
 * fails to return results for a profile. Uses the same thresholds the AI prompt uses.
 */
export const buildNutritionFallback = (product: NormalizedProduct): PersonalAnalysisResult => {
  const positives: PositiveProductAnalysisItem[] = [];
  const negatives: NegativeProductAnalysisItem[] = [];

  for (const t of THRESHOLDS) {
    const value = t.getValue(product.nutrition);
    if (value === null) continue;
    const severity = t.classify(value);
    if (severity === 'neutral') continue;

    const item = {
      ...BASE_ITEM,
      key: t.key,
      label: t.label,
      value,
      unit: t.unit,
    };

    if (severity === 'good') {
      positives.push({ ...item, severity, description: t.descGood });
    } else {
      negatives.push({ ...item, severity, description: t.descBad });
    }
  }

  const score = computeBasicScore(positives.length, negatives.length);

  return {
    fitScore: score,
    fitLabel: score >= 80 ? 'great_fit' : score >= 60 ? 'good_fit' : score >= 40 ? 'neutral' : 'poor_fit',
    summary: 'Basic nutrition analysis (AI analysis was unavailable)',
    positives,
    negatives,
    ingredientAnalysis: null,
  };
};

const computeBasicScore = (positiveCount: number, negativeCount: number): number => {
  const total = positiveCount + negativeCount;
  if (total === 0) return 50;
  const ratio = positiveCount / total;
  return Math.round(30 + ratio * 50);
};
