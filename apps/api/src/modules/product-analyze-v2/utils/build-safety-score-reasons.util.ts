import type { ScoreReason, ScoreReasonCategory } from '@acme/shared';
import type { AiProfileInfo } from '../types/ai-analyze.types.js';
import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import type { SafetyResult } from '../types/scoring.types.js';
import { ADDITIVES_SAFETY } from '../constants/scoring-rules.constants.js';
import {
  addSafetyFallbackReasons,
  addTraceFallbackReasons,
} from './add-safety-fallback-score-reasons.util.js';

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

interface NegativeReasonInput {
  category: ScoreReasonCategory;
  dedupeKey: string;
  description: string;
  impact: number;
  key: string;
  label: string;
  source: ScoreReason['source'];
  unit?: string | null;
  value?: number | null;
}

const ingredientSuffix = (ingredients: string[]): string =>
  ingredients.length > 0 ? `: ${ingredients.join(', ')}` : '';
const traceSuffix = (trace: string): string => (trace.trim() ? `: ${trace.trim()}` : '');
const getRestrictionLabel = (restriction: string): string =>
  RESTRICTION_LABELS[restriction] ?? restriction.toLowerCase().replace(/_/g, ' ');
const getAllergyLabel = (allergy: string): string =>
  ALLERGY_LABELS[allergy] ?? allergy.toLowerCase().replace(/_/g, ' ');
const addNegative = (bucket: Map<string, ScoreReason>, input: NegativeReasonInput) => {
  if (bucket.has(input.dedupeKey)) return;
  bucket.set(input.dedupeKey, {
    key: input.key,
    label: input.label,
    description: input.description,
    value: input.value ?? null,
    unit: input.unit ?? null,
    impact: input.impact,
    kind: 'negative',
    source: input.source,
    category: input.category,
  });
};

const addAiAllergenReasons = (
  ai: AiProfileInfo | null | undefined,
  bucket: Map<string, ScoreReason>,
) => {
  for (const detection of ai?.allergenDetections ?? []) {
    if (!detection.detected) continue;
    const label = getAllergyLabel(detection.allergy);
    addNegative(bucket, {
      key: 'allergens',
      label,
      description: `Contains ${label.toLowerCase()}${ingredientSuffix(detection.ingredients)}`,
      impact: -50,
      source: 'allergen',
      category: 'allergens',
      dedupeKey: `allergen-${detection.allergy.toLowerCase()}`,
    });
  }
};

const addAiRestrictionReasons = (
  ai: AiProfileInfo | null | undefined,
  bucket: Map<string, ScoreReason>,
) => {
  for (const detection of ai?.restrictionDetections ?? []) {
    const status = String(detection.status);
    if (status === 'compatible') continue;
    const label = getRestrictionLabel(detection.restriction);
    const suffix = ingredientSuffix(detection.ingredients);
    const description =
      status === 'not_compatible'
        ? `Not compatible with ${label.toLowerCase()} restriction${suffix}`
        : status === 'semi_compatible'
          ? `Partly compatible with ${label.toLowerCase()} restriction${suffix}`
          : status === 'requires_certification'
            ? `Requires ${label.toLowerCase()} certification — not confirmed${suffix}`
            : `${label} compatibility is unclear${suffix}`;
    addNegative(bucket, {
      key: 'diet-matching',
      label,
      description,
      impact: status === 'not_compatible' ? -50 : status === 'semi_compatible' ? -35 : -20,
      source: 'restriction',
      category: 'diet-matching',
      dedupeKey: `restriction-${detection.restriction.toLowerCase()}`,
    });
  }
};

const addAiTraceReasons = (
  ai: AiProfileInfo | null | undefined,
  bucket: Map<string, ScoreReason>,
) => {
  for (const detection of ai?.traceDetections ?? []) {
    if (detection.allergy) {
      const label = getAllergyLabel(detection.allergy);
      addNegative(bucket, {
        key: 'allergens',
        label,
        description: `May contain traces of ${label.toLowerCase()}${traceSuffix(detection.trace)}`,
        impact: -25,
        source: 'allergen',
        category: 'allergens',
        dedupeKey: `trace-allergen-${detection.allergy.toLowerCase()}`,
      });
    }
    if (detection.restriction) {
      const label = getRestrictionLabel(detection.restriction);
      addNegative(bucket, {
        key: 'diet-matching',
        label,
        description: `Trace risk for ${label.toLowerCase()} restriction${traceSuffix(detection.trace)}`,
        impact: -35,
        source: 'restriction',
        category: 'diet-matching',
        dedupeKey: `trace-restriction-${detection.restriction.toLowerCase()}`,
      });
    }
  }
};

const addAdditiveReasons = (product: NormalizedProductV2, bucket: Map<string, ScoreReason>) => {
  const count = product.additives.length;
  if (count < ADDITIVES_SAFETY.CAUTION_MIN_COUNT) return;
  addNegative(bucket, {
    key: 'additives',
    label: 'Additives',
    value: count,
    description:
      count >= ADDITIVES_SAFETY.HIGH_CONCERN_MIN_COUNT
        ? 'Multiple additives'
        : 'Contains several additives',
    impact: count >= ADDITIVES_SAFETY.HIGH_CONCERN_MIN_COUNT ? -20 : -10,
    source: 'ingredient',
    category: 'additives',
    dedupeKey: 'additives',
  });
};

export function addSafetyReasons(
  product: NormalizedProductV2,
  safety: SafetyResult,
  aiProfileInfo: AiProfileInfo | null | undefined,
  negatives: Map<string, ScoreReason>,
): void {
  addAiAllergenReasons(aiProfileInfo, negatives);
  addAiRestrictionReasons(aiProfileInfo, negatives);
  addAiTraceReasons(aiProfileInfo, negatives);
  addSafetyFallbackReasons(safety, negatives);
  addTraceFallbackReasons(safety, negatives);
  addAdditiveReasons(product, negatives);
}
