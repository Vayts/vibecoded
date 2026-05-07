import type { AiProfileInfo } from '../types/ai-analyze.types.js';
import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import type { ProfileInputForScoring, SafetyResult } from '../types/scoring.types.js';
import {
  ADDITIVES_SAFETY,
  KETO_CARB_THRESHOLD_G,
  SAFETY_SCORE,
} from '../constants/scoring-rules.constants.js';
import { applyFallbackAllergyTags } from './apply-fallback-allergy-tags.util.js';
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

type SafetyStatus = 'safe' | 'caution' | 'avoid';
interface SafetyAccumulator {
  score: number;
  status: SafetyStatus;
  reasons: string[];
  matchedAllergens: string[];
  violatedRestrictions: string[];
  traceAllergens: string[];
  traceRestrictions: string[];
}

const ingredientSuffix = (ingredients: string[]): string =>
  ingredients.length ? `: ${ingredients.join(', ')}` : '';
const humanLabel = (enumValue: string): string => enumValue.toLowerCase().replace(/_/g, ' ');
const pushUnique = (values: string[], value: string): void => {
  if (!values.includes(value)) values.push(value);
};
const isAllergenConfirmed = (source: string, confidence: number): boolean => {
  if (source === 'off_allergen_tag') return true;
  if (source === 'ingredient_text' && confidence >= INGREDIENT_TEXT_CONF_THRESHOLD) return true;
  return source === 'ai_inference' && confidence >= AI_HIGH_CONF_THRESHOLD;
};

function applyAdditivesSafety(
  product: NormalizedProductV2,
  reasons: string[],
): { scorePenalty: number; status: 'safe' | 'caution' } {
  const count = product.additives.length;
  if (count >= ADDITIVES_SAFETY.HIGH_CONCERN_MIN_COUNT) {
    reasons.push(`Contains many additives (${count})`);
    return { scorePenalty: SAFETY_SCORE.ADDITIVES_HIGH_CONCERN_PENALTY, status: 'caution' };
  }
  if (count >= ADDITIVES_SAFETY.CAUTION_MIN_COUNT) {
    reasons.push(`Contains several additives (${count})`);
    return { scorePenalty: SAFETY_SCORE.ADDITIVES_CAUTION_PENALTY, status: 'caution' };
  }
  return { scorePenalty: 0, status: 'safe' };
}

function applyAiAllergenDetections(ai: AiProfileInfo, acc: SafetyAccumulator): void {
  for (const detection of ai.allergenDetections) {
    if (!VALID_ALLERGIES.has(detection.allergy)) continue;
    if (detection.confidence < 0 || detection.confidence > 1 || !detection.detected) continue;
    if (!isAllergenConfirmed(detection.source, detection.confidence)) continue;

    const ingredients = Array.isArray(detection.ingredients) ? detection.ingredients : [];
    acc.score = SAFETY_SCORE.CONFIRMED_ALLERGEN;
    acc.status = 'avoid';
    acc.reasons.push(`Contains ${humanLabel(detection.allergy)}${ingredientSuffix(ingredients)}`);
    pushUnique(acc.matchedAllergens, detection.allergy);
  }
}

function applyAiTraceDetections(ai: AiProfileInfo, acc: SafetyAccumulator): void {
  for (const detection of ai.traceDetections ?? []) {
    if (detection.confidence < 0 || detection.confidence > 1) continue;
    const trace = detection.trace.trim();
    const suffix = trace ? `: ${trace}` : '';

    if (detection.allergy && VALID_ALLERGIES.has(detection.allergy)) {
      acc.score = clampScore(acc.score - SAFETY_SCORE.TRACE_ALLERGEN_PENALTY);
      if (acc.status !== 'avoid') acc.status = 'caution';
      acc.reasons.push(`May contain traces of ${humanLabel(detection.allergy)}${suffix}`);
      pushUnique(acc.traceAllergens, detection.allergy);
    }
    if (detection.restriction && VALID_RESTRICTIONS.has(detection.restriction)) {
      acc.score = Math.min(acc.score, SAFETY_SCORE.TRACE_RESTRICTION_MAX_SCORE);
      if (acc.status !== 'avoid') acc.status = 'caution';
      acc.reasons.push(`Trace risk for ${humanLabel(detection.restriction)} restriction${suffix}`);
      pushUnique(acc.traceRestrictions, detection.restriction);
    }
  }
}

function applyAiRestrictionDetections(ai: AiProfileInfo, acc: SafetyAccumulator): void {
  for (const detection of ai.restrictionDetections) {
    if (!VALID_RESTRICTIONS.has(detection.restriction)) continue;
    const status = String(detection.status);
    if (
      !VALID_RESTRICTION_STATUSES.has(status) ||
      detection.confidence < 0 ||
      detection.confidence > 1
    )
      continue;

    const ingredients = Array.isArray(detection.ingredients) ? detection.ingredients : [];
    const label = humanLabel(detection.restriction);
    if (status === 'not_compatible') {
      acc.score = Math.min(acc.score, SAFETY_SCORE.HARD_RESTRICTION_MAX_SCORE);
      acc.status = 'avoid';
      acc.reasons.push(`Not compatible with ${label} restriction${ingredientSuffix(ingredients)}`);
      pushUnique(acc.violatedRestrictions, detection.restriction);
    } else if (status === 'semi_compatible') {
      acc.score = Math.min(acc.score, SAFETY_SCORE.TRACE_RESTRICTION_MAX_SCORE);
      if (acc.status !== 'avoid') acc.status = 'caution';
      acc.reasons.push(
        `Partly compatible with ${label} restriction${ingredientSuffix(ingredients)}`,
      );
    } else if (status === 'requires_certification') {
      if (acc.status !== 'avoid') acc.status = 'caution';
      acc.reasons.push(
        `Requires ${label} certification — not confirmed${ingredientSuffix(ingredients)}`,
      );
    } else if (status === 'unclear') {
      if (acc.status !== 'avoid') acc.status = 'caution';
      acc.reasons.push(`${label} compatibility is unclear${ingredientSuffix(ingredients)}`);
    }
  }
}

function applyKetoRestriction(
  restrictions: string[],
  product: NormalizedProductV2,
  acc: SafetyAccumulator,
): void {
  if (!restrictions.includes('KETO')) return;
  const carbs = product.nutrition.carbsPer100g;
  if (carbs === null || carbs <= KETO_CARB_THRESHOLD_G) return;
  acc.score = Math.min(acc.score, SAFETY_SCORE.HARD_RESTRICTION_MAX_SCORE);
  acc.status = 'avoid';
  acc.reasons.push(`High carbohydrate content (${carbs}g/100g) — not keto-friendly`);
  pushUnique(acc.violatedRestrictions, 'KETO');
}

export function calculateSafetyScore(
  profile: ProfileInputForScoring,
  product: NormalizedProductV2,
  aiProfileInfo?: AiProfileInfo | null,
): SafetyResult {
  const acc: SafetyAccumulator = {
    score: 100,
    status: 'safe',
    reasons: [],
    matchedAllergens: [],
    violatedRestrictions: [],
    traceAllergens: [],
    traceRestrictions: [],
  };

  if (aiProfileInfo) {
    applyAiAllergenDetections(aiProfileInfo, acc);
    applyAiTraceDetections(aiProfileInfo, acc);
    applyAiRestrictionDetections(aiProfileInfo, acc);
  } else {
    applyFallbackAllergyTags(profile, product, acc);
  }
  applyKetoRestriction(profile.restrictions, product, acc);

  const additivesSafety = applyAdditivesSafety(product, acc.reasons);
  acc.score = clampScore(acc.score - additivesSafety.scorePenalty);
  if (acc.status !== 'avoid' && additivesSafety.status === 'caution') acc.status = 'caution';
  if (acc.status !== 'avoid')
    acc.status = acc.status === 'caution' || acc.score < 60 ? 'caution' : 'safe';

  return { ...acc, score: clampScore(acc.score) };
}
