import type { ProfileInputForScoring } from '../../../types/scoring.types.js';
import {
  VALID_ALLERGY_SET,
  VALID_RESTRICTION_SET,
  VALID_RESTRICTION_STATUS_SET,
  normalizeOverallSummaryText,
} from './ai-contracts.js';
import type { AiProfileInfoWithIngredients, AiTraceDetectionOutput } from './ai-contracts.js';
import { buildAllergyDedupeKey, normalizeCustomAllergyValue } from './ai-allergy-normalization.js';
import { normalizeTraceDetection, removeDuplicateTraceAllergy } from './ai-trace-normalization.js';
import { uniqueNormalizedValues } from './ai-text-normalization.js';

const TRAILING_TRANSLATION_ALIAS_PATTERN =
  /\s*\((?!\s*(?:e\d{3,4}[a-z]?|\d+(?:[.,]\d+)?\s*%)\s*\))[^)]{1,80}\)\s*$/iu;

const normalizeAiEnglishIngredientName = (value: string): string => {
  let normalized = value.trim().replace(/\s+/g, ' ');

  while (TRAILING_TRANSLATION_ALIAS_PATTERN.test(normalized)) {
    normalized = normalized.replace(TRAILING_TRANSLATION_ALIAS_PATTERN, '').trim();
  }

  return normalized;
};

const normalizeAiEnglishIngredientNames = (values: string[]): string[] =>
  uniqueNormalizedValues(
    values
      .map((value) => normalizeAiEnglishIngredientName(value))
      .filter((value) => value.length > 0),
  );

interface NormalizeAiProfileInfoInput {
  aiProfile: AiProfileInfoWithIngredients;
  profile: ProfileInputForScoring;
  traceGroundingValues: string[];
}

export function normalizeAiProfileInfo({
  aiProfile,
  profile,
  traceGroundingValues,
}: NormalizeAiProfileInfoInput): AiProfileInfoWithIngredients {
  const canIHaveThis =
    aiProfile.canIHaveThis.reason.trim().length > 0
      ? {
          can: aiProfile.canIHaveThis.can,
          status: aiProfile.canIHaveThis.status,
          reason: aiProfile.canIHaveThis.reason.trim(),
        }
      : {
          can: false,
          status: 'no' as const,
          reason: 'I cannot confirm this product is suitable for you.',
        };
  const overallSummary =
    typeof aiProfile.overallSummary === 'string' && aiProfile.overallSummary.trim().length > 0
      ? normalizeOverallSummaryText(aiProfile.overallSummary)
      : null;
  const rawDetectedAllergens = (aiProfile.allergenDetections ?? []).filter(
    (detection) => detection.detected,
  );
  const allergenDetections = rawDetectedAllergens
    .filter(
      (detection) =>
        VALID_ALLERGY_SET.has(detection.allergy) &&
        detection.confidence >= 0 &&
        detection.confidence <= 1,
    )
    .map((detection) => ({
      ...detection,
      customAllergy:
        detection.allergy === 'OTHER' ? normalizeCustomAllergyValue(detection.customAllergy) : null,
      ingredients: Array.isArray(detection.ingredients)
        ? normalizeAiEnglishIngredientNames(detection.ingredients)
        : [],
      evidence: Array.isArray(detection.evidence) ? detection.evidence : [],
    }));
  const directAllergyKeys = new Set(
    allergenDetections
      .map((detection) => buildAllergyDedupeKey(detection.allergy, detection.customAllergy))
      .filter((key): key is string => key !== null),
  );
  const restrictionDetections = (aiProfile.restrictionDetections ?? [])
    .filter(
      (detection) =>
        VALID_RESTRICTION_SET.has(detection.restriction) &&
        VALID_RESTRICTION_STATUS_SET.has(detection.status) &&
        detection.confidence >= 0 &&
        detection.confidence <= 1,
    )
    .map((detection) => ({
      ...detection,
      ingredients: Array.isArray(detection.ingredients)
        ? normalizeAiEnglishIngredientNames(detection.ingredients)
        : [],
      evidence: Array.isArray(detection.evidence) ? detection.evidence : [],
    }));
  const traceDetections = (aiProfile.traceDetections ?? [])
    .filter(
      (detection) =>
        detection.trace.trim().length > 0 && detection.confidence >= 0 && detection.confidence <= 1,
    )
    .map((detection) =>
      normalizeTraceDetection(
        { ...detection, evidence: Array.isArray(detection.evidence) ? detection.evidence : [] },
        traceGroundingValues,
      ),
    )
    .filter((detection): detection is AiTraceDetectionOutput => detection !== null)
    .map((detection) => removeDuplicateTraceAllergy(detection, directAllergyKeys))
    .filter((detection): detection is AiTraceDetectionOutput => detection !== null)
    .filter((detection) => detection.allergy || detection.restriction);
  const ingredients = (aiProfile.ingredients ?? [])
    .filter(
      (ingredient) =>
        ingredient.name.trim().length > 0 &&
        ingredient.confidence >= 0 &&
        ingredient.confidence <= 1,
    )
    .map((ingredient) => ({
      name: normalizeAiEnglishIngredientName(ingredient.name),
      compatible: ingredient.compatible,
      confidence: ingredient.confidence,
      evidence: Array.isArray(ingredient.evidence) ? ingredient.evidence : [],
    }))
    .filter((ingredient) => ingredient.name.length > 0);
  const allowedAllergies = new Set(profile.allergies);
  const allowedRestrictions = new Set(profile.restrictions);

  return {
    profileType: aiProfile.profileType,
    profileId: aiProfile.profileId,
    displayName: aiProfile.displayName ?? profile.displayName,
    allergenDetections: allergenDetections.filter((detection) =>
      allowedAllergies.has(detection.allergy),
    ),
    restrictionDetections: restrictionDetections.filter((detection) =>
      allowedRestrictions.has(detection.restriction),
    ),
    traceDetections: traceDetections.filter((detection) => {
      const allergyInScope = detection.allergy ? allowedAllergies.has(detection.allergy) : false;
      const restrictionInScope = detection.restriction
        ? allowedRestrictions.has(detection.restriction)
        : false;
      return allergyInScope || restrictionInScope;
    }),
    ingredients,
    overallSummary,
    canIHaveThis,
    uncertaintyFlags: Array.isArray(aiProfile.uncertaintyFlags) ? aiProfile.uncertaintyFlags : [],
  };
}
