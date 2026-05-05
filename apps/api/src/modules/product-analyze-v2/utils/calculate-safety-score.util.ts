import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import type { SafetyResult, ProfileInputForScoring } from '../types/scoring.types.js';
import type { AiProfileInfo } from '../types/ai-analyze.types.js';
import {
  ADDITIVES_SAFETY,
  SAFETY_SCORE,
  KETO_CARB_THRESHOLD_G,
} from '../constants/scoring-rules.constants.js';
import { clampScore } from './nutrient-score.util.js';

const VALID_ALLERGIES = new Set([
  'PEANUTS',
  'TREE_NUTS',
  'GLUTEN',
  'DAIRY',
  'SOY',
  'EGGS',
  'SHELLFISH',
  'SESAME',
  'OTHER',
]);

const VALID_RESTRICTIONS = new Set([
  'VEGAN',
  'VEGETARIAN',
  'KETO',
  'PALEO',
  'GLUTEN_FREE',
  'DAIRY_FREE',
  'PORK_FREE',
  'NUT_FREE',
]);

const VALID_RESTRICTION_STATUSES = new Set([
  'compatible',
  'semi_compatible',
  'not_compatible',
  'unclear',
  'requires_certification',
]);

const AI_HIGH_CONF_THRESHOLD = 0.9;
const INGREDIENT_TEXT_CONF_THRESHOLD = 0.85;
const TRACE_RESTRICTION_MAX_SCORE = 40;

function ingredientSuffix(ingredients: string[]): string {
  return ingredients.length ? `: ${ingredients.join(', ')}` : '';
}

function humanLabel(enumValue: string): string {
  return enumValue.toLowerCase().replace(/_/g, ' ');
}

function isAllergenConfirmed(source: string, confidence: number): boolean {
  if (source === 'off_allergen_tag') return true;
  if (source === 'ingredient_text' && confidence >= INGREDIENT_TEXT_CONF_THRESHOLD) return true;
  return source === 'ai_inference' && confidence >= AI_HIGH_CONF_THRESHOLD;
}

function isAllergenTrace(source: string): boolean {
  return source === 'off_trace_tag';
}

function applyAdditivesSafety(
  product: NormalizedProductV2,
  reasons: string[],
): { scorePenalty: number; status: 'safe' | 'caution' } {
  const additivesCount = product.additives.length;

  if (additivesCount >= ADDITIVES_SAFETY.HIGH_CONCERN_MIN_COUNT) {
    reasons.push(`Contains many additives (${additivesCount})`);
    return {
      scorePenalty: SAFETY_SCORE.ADDITIVES_HIGH_CONCERN_PENALTY,
      status: 'caution',
    };
  }

  if (additivesCount >= ADDITIVES_SAFETY.CAUTION_MIN_COUNT) {
    reasons.push(`Contains several additives (${additivesCount})`);
    return {
      scorePenalty: SAFETY_SCORE.ADDITIVES_CAUTION_PENALTY,
      status: 'caution',
    };
  }

  return { scorePenalty: 0, status: 'safe' };
}

export function calculateSafetyScore(
  profile: ProfileInputForScoring,
  product: NormalizedProductV2,
  aiProfileInfo?: AiProfileInfo | null,
): SafetyResult {
  let score = 100;
  let status: 'safe' | 'caution' | 'avoid' = 'safe';
  const reasons: string[] = [];
  const matchedAllergens: string[] = [];
  const violatedRestrictions: string[] = [];

  if (aiProfileInfo) {
    for (const detection of aiProfileInfo.allergenDetections) {
      if (!VALID_ALLERGIES.has(detection.allergy)) continue;
      if (detection.confidence < 0 || detection.confidence > 1) continue;
      if (!detection.detected) continue;

      const ingr = Array.isArray(detection.ingredients) ? detection.ingredients : [];
      const label = humanLabel(detection.allergy);

      if (isAllergenConfirmed(detection.source, detection.confidence)) {
        score = SAFETY_SCORE.CONFIRMED_ALLERGEN;
        status = 'avoid';
        reasons.push(`Contains ${label}${ingredientSuffix(ingr)}`);
        if (!matchedAllergens.includes(detection.allergy)) matchedAllergens.push(detection.allergy);
      } else if (isAllergenTrace(detection.source)) {
        score = clampScore(score - SAFETY_SCORE.TRACE_ALLERGEN_PENALTY);
        if (status !== 'avoid') status = 'caution';
        reasons.push(`May contain traces of ${label}${ingredientSuffix(ingr)}`);
        if (!matchedAllergens.includes(detection.allergy)) matchedAllergens.push(detection.allergy);
      }
    }

    for (const detection of aiProfileInfo.restrictionDetections) {
      if (!VALID_RESTRICTIONS.has(detection.restriction)) continue;
      const restrictionStatus = String(detection.status);
      if (!VALID_RESTRICTION_STATUSES.has(restrictionStatus)) continue;
      if (detection.confidence < 0 || detection.confidence > 1) continue;

      const ingr = Array.isArray(detection.ingredients) ? detection.ingredients : [];
      const label = humanLabel(detection.restriction);

      if (restrictionStatus === 'not_compatible') {
        score = Math.min(score, SAFETY_SCORE.HARD_RESTRICTION_MAX_SCORE);
        status = 'avoid';
        reasons.push(`Not compatible with ${label} restriction${ingredientSuffix(ingr)}`);
        if (!violatedRestrictions.includes(detection.restriction))
          violatedRestrictions.push(detection.restriction);
      } else if (restrictionStatus === 'semi_compatible') {
        score = Math.min(score, TRACE_RESTRICTION_MAX_SCORE);
        if (status !== 'avoid') status = 'caution';
        reasons.push(`Trace risk for ${label} restriction${ingredientSuffix(ingr)}`);
      } else if (restrictionStatus === 'requires_certification') {
        if (status !== 'avoid') status = 'caution';
        reasons.push(`Requires ${label} certification — not confirmed${ingredientSuffix(ingr)}`);
      } else if (restrictionStatus === 'unclear') {
        if (status !== 'avoid') status = 'caution';
        reasons.push(`${label} compatibility is unclear${ingredientSuffix(ingr)}`);
      }
    }

    if (profile.restrictions.includes('KETO')) {
      const carbs = product.nutrition.carbsPer100g;
      if (carbs !== null && carbs > KETO_CARB_THRESHOLD_G) {
        score = Math.min(score, SAFETY_SCORE.HARD_RESTRICTION_MAX_SCORE);
        status = 'avoid';
        reasons.push(`High carbohydrate content (${carbs}g/100g) — not keto-friendly`);
        if (!violatedRestrictions.includes('KETO')) violatedRestrictions.push('KETO');
      }
    }
  } else {
    // Fallback: use OFF allergen/trace tags only (AI unavailable)
    for (const allergy of profile.allergies) {
      if (allergy === 'OTHER') {
        // Custom allergy text needs semantic analysis and is handled only by AI.
        continue;
      }

      const offAllergenMatch = product.allergens.some((a) =>
        a.toLowerCase().includes(allergy.toLowerCase().replace(/_/g, ' ')),
      );
      const offTraceMatch = product.traces.some((t) =>
        t.toLowerCase().includes(allergy.toLowerCase().replace(/_/g, ' ')),
      );

      if (offAllergenMatch) {
        score = SAFETY_SCORE.CONFIRMED_ALLERGEN;
        status = 'avoid';
        reasons.push(`Contains ${humanLabel(allergy)} (from product allergen data)`);
        if (!matchedAllergens.includes(allergy)) matchedAllergens.push(allergy);
      } else if (offTraceMatch) {
        score = clampScore(score - SAFETY_SCORE.TRACE_ALLERGEN_PENALTY);
        if (status !== 'avoid') status = 'caution';
        reasons.push(`May contain traces of ${humanLabel(allergy)}`);
        if (!matchedAllergens.includes(allergy)) matchedAllergens.push(allergy);
      }
    }

    for (const restriction of profile.restrictions) {
      if (restriction === 'KETO') {
        const carbs = product.nutrition.carbsPer100g;
        if (carbs !== null && carbs > KETO_CARB_THRESHOLD_G) {
          score = Math.min(score, SAFETY_SCORE.HARD_RESTRICTION_MAX_SCORE);
          status = 'avoid';
          reasons.push(`High carbohydrate content (${carbs}g/100g) — not keto-friendly`);
          if (!violatedRestrictions.includes(restriction)) violatedRestrictions.push(restriction);
        }
      }
    }
  }

  const additivesSafety = applyAdditivesSafety(product, reasons);
  score = clampScore(score - additivesSafety.scorePenalty);

  if (status !== 'avoid' && additivesSafety.status === 'caution') {
    status = 'caution';
  }

  if (status !== 'avoid') {
    status = status === 'caution' || score < 60 ? 'caution' : 'safe';
  }

  return {
    score: clampScore(score),
    status,
    reasons,
    matchedAllergens,
    violatedRestrictions,
  };
}
