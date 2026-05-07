import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import type { ProfileInputForScoring } from '../types/scoring.types.js';
import { SAFETY_SCORE } from '../constants/scoring-rules.constants.js';
import { clampScore } from './nutrient-score.util.js';

export interface FallbackAllergyAccumulator {
  score: number;
  status: 'safe' | 'caution' | 'avoid';
  reasons: string[];
  matchedAllergens: string[];
  traceAllergens: string[];
}

const humanLabel = (enumValue: string): string => enumValue.toLowerCase().replace(/_/g, ' ');

const pushUnique = (values: string[], value: string): void => {
  if (!values.includes(value)) values.push(value);
};

export function applyFallbackAllergyTags(
  profile: ProfileInputForScoring,
  product: NormalizedProductV2,
  acc: FallbackAllergyAccumulator,
): void {
  for (const allergy of profile.allergies) {
    if (allergy === 'OTHER') continue;
    const label = allergy.toLowerCase().replace(/_/g, ' ');
    const allergenMatch = product.allergens.some((a) => a.toLowerCase().includes(label));
    const traceMatch = product.traces.some((t) => t.toLowerCase().includes(label));

    if (allergenMatch) {
      acc.score = SAFETY_SCORE.CONFIRMED_ALLERGEN;
      acc.status = 'avoid';
      acc.reasons.push(`Contains ${humanLabel(allergy)} (from product allergen data)`);
      pushUnique(acc.matchedAllergens, allergy);
    } else if (traceMatch) {
      acc.score = clampScore(acc.score - SAFETY_SCORE.TRACE_ALLERGEN_PENALTY);
      if (acc.status !== 'avoid') acc.status = 'caution';
      acc.reasons.push(`May contain traces of ${humanLabel(allergy)}`);
      pushUnique(acc.traceAllergens, allergy);
    }
  }
}
