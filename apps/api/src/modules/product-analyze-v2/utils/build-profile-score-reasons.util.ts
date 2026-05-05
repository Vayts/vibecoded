import type { ScoreReason, ScoreReasonCategory } from '@acme/shared';
import type { AiProfileInfo } from '../types/ai-analyze.types.js';
import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import type { ProductRole } from '../types/product-role.types.js';
import type { SafetyResult } from '../types/scoring.types.js';
import { ADDITIVES_SAFETY } from '../constants/scoring-rules.constants.js';
import { buildNutritionDisplayReasons } from './build-nutrition-display-reasons.util.js';

interface BuildProfileScoreReasonsInput {
  product: NormalizedProductV2;
  role: ProductRole;
  safety: SafetyResult;
  aiProfileInfo?: AiProfileInfo | null;
}

interface ScoreReasonBuckets {
  positives: ScoreReason[];
  negatives: ScoreReason[];
}

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

const addReason = (
  bucket: Map<string, ScoreReason>,
  reason: ScoreReason,
  dedupeKey = reason.key,
): void => {
  if (!bucket.has(dedupeKey)) {
    bucket.set(dedupeKey, reason);
  }
};

const ingredientSuffix = (ingredients: string[]): string =>
  ingredients.length > 0 ? `: ${ingredients.join(', ')}` : '';

const getRestrictionLabel = (restriction: string): string =>
  RESTRICTION_LABELS[restriction] ?? restriction.toLowerCase().replace(/_/g, ' ');

const getAllergyLabel = (allergy: string): string =>
  ALLERGY_LABELS[allergy] ?? allergy.toLowerCase().replace(/_/g, ' ');

const createReason = (input: {
  key: string;
  label: string;
  description: string;
  value: number | null;
  unit: string | null;
  impact: number;
  kind: ScoreReason['kind'];
  source: ScoreReason['source'];
  category?: ScoreReasonCategory;
}): ScoreReason => ({
  key: input.key,
  label: input.label,
  description: input.description,
  value: input.value,
  unit: input.unit,
  impact: input.impact,
  kind: input.kind,
  source: input.source,
  category: input.category,
});

const addNutritionReasons = (
  product: NormalizedProductV2,
  role: ProductRole,
  positives: Map<string, ScoreReason>,
  negatives: Map<string, ScoreReason>,
): void => {
  const nutritionReasons = buildNutritionDisplayReasons(product, role);

  nutritionReasons.forEach((reason) => {
    const scoreReason = createReason(reason);

    if (reason.kind === 'positive') {
      addReason(positives, scoreReason);
      return;
    }

    addReason(negatives, scoreReason);
  });
};

const addSafetyReasons = (
  product: NormalizedProductV2,
  safety: SafetyResult,
  aiProfileInfo: AiProfileInfo | null | undefined,
  negatives: Map<string, ScoreReason>,
): void => {
  for (const detection of aiProfileInfo?.allergenDetections ?? []) {
    if (!detection.detected) continue;

    const label = getAllergyLabel(detection.allergy);
    const description =
      detection.source === 'off_trace_tag'
        ? `May contain traces of ${label.toLowerCase()}${ingredientSuffix(detection.ingredients)}`
        : `Contains ${label.toLowerCase()}${ingredientSuffix(detection.ingredients)}`;

    addReason(
      negatives,
      createReason({
        key: 'allergens',
        label,
        description,
        value: null,
        unit: null,
        impact: detection.source === 'off_trace_tag' ? -25 : -50,
        kind: 'negative',
        source: 'allergen',
        category: 'allergens',
      }),
      `allergen-${detection.allergy.toLowerCase()}`,
    );
  }

  for (const detection of aiProfileInfo?.restrictionDetections ?? []) {
    const restrictionStatus = String(detection.status);
    if (restrictionStatus === 'compatible') continue;

    const label = getRestrictionLabel(detection.restriction);
    const description =
      restrictionStatus === 'not_compatible'
        ? `Not compatible with ${label.toLowerCase()} restriction${ingredientSuffix(detection.ingredients)}`
        : restrictionStatus === 'semi_compatible'
          ? `Trace risk for ${label.toLowerCase()} restriction${ingredientSuffix(detection.ingredients)}`
          : restrictionStatus === 'requires_certification'
            ? `Requires ${label.toLowerCase()} certification — not confirmed${ingredientSuffix(detection.ingredients)}`
            : `${label} compatibility is unclear${ingredientSuffix(detection.ingredients)}`;

    addReason(
      negatives,
      createReason({
        key: 'diet-matching',
        label,
        description,
        value: null,
        unit: null,
        impact:
          restrictionStatus === 'not_compatible'
            ? -50
            : restrictionStatus === 'semi_compatible'
              ? -35
              : -20,
        kind: 'negative',
        source: 'restriction',
        category: 'diet-matching',
      }),
      `restriction-${detection.restriction.toLowerCase()}`,
    );
  }

  safety.matchedAllergens.forEach((allergy) => {
    const label = getAllergyLabel(allergy);

    addReason(
      negatives,
      createReason({
        key: 'allergens',
        label,
        description: `Contains ${label.toLowerCase()}`,
        value: null,
        unit: null,
        impact: -50,
        kind: 'negative',
        source: 'allergen',
        category: 'allergens',
      }),
      `allergen-${allergy.toLowerCase()}`,
    );
  });

  safety.violatedRestrictions.forEach((restriction) => {
    const label = getRestrictionLabel(restriction);
    const matchingReason =
      safety.reasons.find((reason) => reason.toLowerCase().includes(label.toLowerCase())) ??
      `Not compatible with ${label.toLowerCase()} restriction`;

    addReason(
      negatives,
      createReason({
        key: 'diet-matching',
        label,
        description: matchingReason,
        value: null,
        unit: null,
        impact: -50,
        kind: 'negative',
        source: 'restriction',
        category: 'diet-matching',
      }),
      `restriction-${restriction.toLowerCase()}`,
    );
  });

  const additivesCount = product.additives.length;

  if (additivesCount >= ADDITIVES_SAFETY.HIGH_CONCERN_MIN_COUNT) {
    addReason(
      negatives,
      createReason({
        key: 'additives',
        label: 'Additives',
        description: 'Multiple additives',
        value: additivesCount,
        unit: null,
        impact: -20,
        kind: 'negative',
        source: 'ingredient',
        category: 'additives',
      }),
      'additives',
    );

    return;
  }

  if (additivesCount >= ADDITIVES_SAFETY.CAUTION_MIN_COUNT) {
    addReason(
      negatives,
      createReason({
        key: 'additives',
        label: 'Additives',
        description: 'Contains several additives',
        value: additivesCount,
        unit: null,
        impact: -10,
        kind: 'negative',
        source: 'ingredient',
        category: 'additives',
      }),
      'additives',
    );
  }
};

export function buildProfileScoreReasons({
  product,
  role,
  safety,
  aiProfileInfo,
}: BuildProfileScoreReasonsInput): ScoreReasonBuckets {
  const positives = new Map<string, ScoreReason>();
  const negatives = new Map<string, ScoreReason>();

  addNutritionReasons(product, role, positives, negatives);
  addSafetyReasons(product, safety, aiProfileInfo, negatives);

  return {
    positives: Array.from(positives.values()),
    negatives: Array.from(negatives.values()),
  };
}
