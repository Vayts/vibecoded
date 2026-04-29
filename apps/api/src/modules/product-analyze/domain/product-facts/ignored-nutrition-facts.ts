import type { IgnoredNutritionFact } from '@acme/shared';
import { IGNORED_NUTRITION_FACT_VALUES } from '@acme/shared';

const IGNORED_NUTRITION_FACT_ORDER = new Map(
  IGNORED_NUTRITION_FACT_VALUES.map((value, index) => [value, index]),
);

export const normalizeIgnoredNutritionFacts = (
  facts: readonly IgnoredNutritionFact[] | undefined,
): IgnoredNutritionFact[] => {
  if (!facts || facts.length === 0) {
    return [];
  }

  return Array.from(new Set(facts)).sort(
    (left, right) =>
      (IGNORED_NUTRITION_FACT_ORDER.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (IGNORED_NUTRITION_FACT_ORDER.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
};

