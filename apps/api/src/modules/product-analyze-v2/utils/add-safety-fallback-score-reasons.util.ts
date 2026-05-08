import type { ScoreReason } from '@acme/shared';
import type { SafetyResult } from '../types/scoring.types.js';

const ALLERGY_LABELS: Record<string, string> = {
  PEANUTS: 'Peanuts',
  TREE_NUTS: 'Tree nuts',
  GLUTEN: 'Gluten',
  DAIRY: 'Dairy',
  SOY: 'Soy',
  EGGS: 'Eggs',
  SHELLFISH: 'Shellfish',
  SESAME: 'Sesame',
  OTHER: 'Custom allergy',
};

const RESTRICTION_LABELS: Record<string, string> = {
  VEGAN: 'Vegan',
  VEGETARIAN: 'Vegetarian',
  KETO: 'Keto',
  PALEO: 'Paleo',
  GLUTEN_FREE: 'Gluten-free',
  DAIRY_FREE: 'Dairy-free',
  PORK_FREE: 'Pork-free',
  NUT_FREE: 'Nut-free',
};

interface FallbackReasonInput {
  category: ScoreReason['category'];
  dedupeKey: string;
  description: string;
  impact: number;
  key: string;
  label: string;
  source: ScoreReason['source'];
}

const getRestrictionLabel = (restriction: string): string =>
  RESTRICTION_LABELS[restriction] ?? restriction.toLowerCase().replace(/_/g, ' ');

const getAllergyLabel = (allergy: string): string =>
  ALLERGY_LABELS[allergy] ?? allergy.toLowerCase().replace(/_/g, ' ');

const findReason = (safety: SafetyResult, label: string, fallback: string): string =>
  safety.reasons.find((reason) => reason.toLowerCase().includes(label.toLowerCase())) ?? fallback;

const addFallbackReason = (bucket: Map<string, ScoreReason>, input: FallbackReasonInput): void => {
  if (bucket.has(input.dedupeKey)) return;
  bucket.set(input.dedupeKey, {
    key: input.key,
    label: input.label,
    description: input.description,
    value: null,
    unit: null,
    impact: input.impact,
    kind: 'negative',
    source: input.source,
    category: input.category,
  });
};

export function addSafetyFallbackReasons(
  safety: SafetyResult,
  bucket: Map<string, ScoreReason>,
): void {
  safety.matchedAllergens.forEach((allergy) => {
    const label = getAllergyLabel(allergy);
    addFallbackReason(bucket, {
      key: 'allergens',
      label,
      description: `Contains ${label.toLowerCase()}`,
      impact: -50,
      source: 'allergen',
      category: 'allergens',
      dedupeKey: `allergen-${allergy.toLowerCase()}`,
    });
  });

  safety.violatedRestrictions.forEach((restriction) => {
    const label = getRestrictionLabel(restriction);
    addFallbackReason(bucket, {
      key: 'diet-matching',
      label,
      description: findReason(
        safety,
        label,
        `Not compatible with ${label.toLowerCase()} restriction`,
      ),
      impact: -50,
      source: 'restriction',
      category: 'diet-matching',
      dedupeKey: `restriction-${restriction.toLowerCase()}`,
    });
  });
}

export function addTraceFallbackReasons(
  safety: SafetyResult,
  bucket: Map<string, ScoreReason>,
): void {
  safety.traceAllergens.forEach((allergy) => {
    const label = getAllergyLabel(allergy);
    addFallbackReason(bucket, {
      key: 'allergens',
      label,
      description: findReason(safety, label, `May contain traces of ${label.toLowerCase()}`),
      impact: -25,
      source: 'allergen',
      category: 'allergens',
      dedupeKey: `trace-allergen-${allergy.toLowerCase()}`,
    });
  });

  safety.traceRestrictions.forEach((restriction) => {
    const label = getRestrictionLabel(restriction);
    addFallbackReason(bucket, {
      key: 'diet-matching',
      label,
      description: findReason(safety, label, `Trace risk for ${label.toLowerCase()} restriction`),
      impact: -35,
      source: 'restriction',
      category: 'diet-matching',
      dedupeKey: `trace-restriction-${restriction.toLowerCase()}`,
    });
  });
}
