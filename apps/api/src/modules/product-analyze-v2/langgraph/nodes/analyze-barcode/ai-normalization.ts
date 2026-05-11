import { FALLBACK_ROLE } from '../../../constants/product-roles.constants.js';
import type { ProductRole } from '../../../types/product-role.types.js';
import type { ProfileInputForScoring } from '../../../types/scoring.types.js';
import { normalizeOpenFoodFactsProduct } from '../../../utils/normalize-open-food-facts-product.util.js';
import { normalizeTraceRestriction } from '../../../utils/trace-sensitive-restrictions.util.js';
import {
  VALID_ALLERGY_SET,
  VALID_RESTRICTION_SET,
  VALID_RESTRICTION_STATUS_SET,
  normalizeOverallSummaryText,
} from './ai-contracts.js';
import type {
  AiAnalyzeV2Output,
  AiProfileInfoWithIngredients,
  AiTraceDetectionOutput,
  ValidatedAiAnalyzeV2Result,
} from './ai-contracts.js';

const NEGATIVE_EVIDENCE_PATTERN =
  /\b(?:no|none|without|absent|missing|unlisted)\b|\bnot\s+(?:listed|found|present|detected|triggered|directly\s+triggered)\b|\bdoes\s+not\s+(?:contain|list|show|include|appear|match)\b|\b(?:isn't|is\s+not)\s+(?:listed|present|included|detected|triggered)\b|\bfree\s+from\b/iu;

const normalizeGroundingText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeAiEnglishProductName = (
  value: string | null | undefined,
  originalName: string | null,
): string | null => {
  const normalized = value?.trim().replace(/\s+/g, ' ') ?? '';

  if (!normalized) {
    return null;
  }

  if (originalName && normalizeGroundingText(normalized) === normalizeGroundingText(originalName)) {
    return null;
  }

  return normalized;
};

const uniqueNormalizedValues = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeGroundingText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(value.trim());
  }

  return result;
};

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

const buildTraceGroundingValues = (
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
): string[] => uniqueNormalizedValues(product.traces);

const textContainsGroundedValue = (text: string, groundingValues: string[]): boolean => {
  const normalizedText = normalizeGroundingText(text);
  if (!normalizedText) return false;

  return groundingValues.some((value) => {
    const normalizedValue = normalizeGroundingText(value);
    return (
      normalizedValue.length > 1 &&
      (normalizedText.includes(normalizedValue) || normalizedValue.includes(normalizedText))
    );
  });
};

const normalizeCustomAllergyValue = (value: string | null | undefined): string | null => {
  const normalized = value?.trim().replace(/\s+/g, ' ') ?? '';
  return normalized.length > 0 ? normalized : null;
};

const buildAllergyDedupeKey = (
  allergy: string | null | undefined,
  customAllergy?: string | null,
): string | null => {
  if (!allergy) return null;

  if (allergy === 'OTHER') {
    const customKey = normalizeCustomAllergyValue(customAllergy)?.toLowerCase();
    return customKey ? `OTHER:${customKey}` : null;
  }

  return allergy;
};

const removeDuplicateTraceAllergy = (
  detection: AiTraceDetectionOutput,
  directAllergyKeys: Set<string>,
): AiTraceDetectionOutput | null => {
  const allergyKey = buildAllergyDedupeKey(detection.allergy, detection.customAllergy);

  if (!allergyKey || !directAllergyKeys.has(allergyKey)) {
    return detection;
  }

  if (detection.restriction) {
    return {
      ...detection,
      allergy: null,
      customAllergy: null,
    };
  }

  return null;
};

const normalizeTraceDetection = (
  detection: AiTraceDetectionOutput,
  groundingValues: string[],
): AiTraceDetectionOutput | null => {
  const evidence = Array.isArray(detection.evidence) ? detection.evidence : [];
  const evidenceText = evidence.join(' ');
  const trace = detection.trace.trim();

  if (!trace || NEGATIVE_EVIDENCE_PATTERN.test(evidenceText)) {
    return null;
  }

  const hasGroundedEvidence =
    groundingValues.length > 0 &&
    (textContainsGroundedValue(trace, groundingValues) ||
      evidence.some((item) => textContainsGroundedValue(item, groundingValues)));

  if (!hasGroundedEvidence) {
    return null;
  }

  const allergy =
    detection.allergy && VALID_ALLERGY_SET.has(detection.allergy) ? detection.allergy : null;
  const restriction =
    detection.restriction && VALID_RESTRICTION_SET.has(detection.restriction)
      ? normalizeTraceRestriction(detection.restriction)
      : null;

  return {
    trace,
    allergy,
    customAllergy:
      allergy === 'OTHER' ? normalizeCustomAllergyValue(detection.customAllergy) : null,
    restriction,
    source: detection.source,
    confidence: detection.confidence,
    evidence,
  };
};

export function validateAndNormalizeAiResult(
  raw: AiAnalyzeV2Output | null,
  profiles: ProfileInputForScoring[],
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
): ValidatedAiAnalyzeV2Result {
  const traceGroundingValues = buildTraceGroundingValues(product);

  const fallbackResult: ValidatedAiAnalyzeV2Result = {
    product: {
      isFoodProduct: true,
      englishName: null,
      role: FALLBACK_ROLE,
      confidence: 0,
      evidence: ['AI response was invalid. Falling back to generic_food.'],
    },
    profileInfo: [],
  };

  if (
    !raw ||
    !raw.product ||
    typeof raw.product.isFoodProduct !== 'boolean' ||
    !raw.product.role ||
    raw.product.confidence === undefined ||
    !Array.isArray(raw.product.evidence) ||
    !Array.isArray(raw.profileInfo)
  ) {
    return fallbackResult;
  }

  const validatedProfileInfo: AiProfileInfoWithIngredients[] = profiles.map((profile) => {
    const aiProfile = raw.profileInfo.find(
      (candidate) =>
        candidate.profileId === profile.profileId && candidate.profileType === profile.profileType,
    );

    if (!aiProfile) {
      return buildFallbackProfileInfo(profile);
    }

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

    const rawDetectedAllergenDetections = (aiProfile.allergenDetections ?? []).filter(
      (detection) => detection.detected,
    );

    const allergenDetections = rawDetectedAllergenDetections
      .filter(
        (detection) =>
          VALID_ALLERGY_SET.has(detection.allergy) &&
          detection.confidence >= 0 &&
          detection.confidence <= 1,
      )
      .map((detection) => ({
        ...detection,
        customAllergy:
          detection.allergy === 'OTHER'
            ? normalizeCustomAllergyValue(detection.customAllergy)
            : null,
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

    const rawValidTraceDetections = (aiProfile.traceDetections ?? []).filter(
      (detection) =>
        detection.trace.trim().length > 0 && detection.confidence >= 0 && detection.confidence <= 1,
    );

    const traceDetections = rawValidTraceDetections
      .map((detection) =>
        normalizeTraceDetection(
          {
            ...detection,
            allergy: detection.allergy ?? null,
            customAllergy: detection.customAllergy ?? null,
            restriction: detection.restriction ?? null,
            evidence: Array.isArray(detection.evidence) ? detection.evidence : [],
          },
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
    const scopedAllergenDetections = allergenDetections.filter((detection) =>
      allowedAllergies.has(detection.allergy),
    );

    const allowedRestrictions = new Set(profile.restrictions);
    const scopedRestrictionDetections = restrictionDetections.filter((detection) =>
      allowedRestrictions.has(detection.restriction),
    );

    const scopedTraceDetections = traceDetections.filter((detection) => {
      const allergyInScope = detection.allergy ? allowedAllergies.has(detection.allergy) : false;
      const restrictionInScope = detection.restriction
        ? allowedRestrictions.has(detection.restriction)
        : false;
      return allergyInScope || restrictionInScope;
    });

    const invalidAllergenDetectionCount =
      rawDetectedAllergenDetections.length - allergenDetections.length;
    const droppedAllergens = allergenDetections.filter(
      (detection) => !allowedAllergies.has(detection.allergy),
    );
    const droppedRestrictions = restrictionDetections.filter(
      (detection) => !allowedRestrictions.has(detection.restriction),
    );
    const droppedTraceDetections = traceDetections.filter((detection) => {
      const allergyInScope = detection.allergy ? allowedAllergies.has(detection.allergy) : false;
      const restrictionInScope = detection.restriction
        ? allowedRestrictions.has(detection.restriction)
        : false;
      return !allergyInScope && !restrictionInScope;
    });

    if (
      invalidAllergenDetectionCount > 0 ||
      droppedAllergens.length > 0 ||
      droppedRestrictions.length > 0 ||
      droppedTraceDetections.length > 0
    ) {
      console.warn(`[ProductAnalyzeV2] Invalid or out-of-scope AI detections dropped`, {
        profileId: profile.profileId,
        invalidAllergenDetectionCount,
        droppedAllergenDetections: droppedAllergens.map((detection) => detection.allergy),
        droppedRestrictionDetections: droppedRestrictions.map((detection) => detection.restriction),
        droppedTraceDetections: droppedTraceDetections.map((detection) => ({
          trace: detection.trace,
          allergy: detection.allergy,
          restriction: detection.restriction,
        })),
      });
    }

    return {
      profileType: aiProfile.profileType,
      profileId: aiProfile.profileId,
      displayName: aiProfile.displayName ?? profile.displayName,
      allergenDetections: scopedAllergenDetections,
      restrictionDetections: scopedRestrictionDetections,
      traceDetections: scopedTraceDetections,
      ingredients,
      overallSummary,
      canIHaveThis,
      uncertaintyFlags: Array.isArray(aiProfile.uncertaintyFlags) ? aiProfile.uncertaintyFlags : [],
    };
  });

  return {
    product: {
      isFoodProduct: raw.product.isFoodProduct,
      englishName: normalizeAiEnglishProductName(raw.product.englishName, product.name),
      role: raw.product.role as ProductRole,
      confidence: raw.product.confidence,
      evidence: raw.product.evidence,
    },
    profileInfo: validatedProfileInfo,
  };
}

export function buildFallbackProfileInfo(
  profile: ProfileInputForScoring,
): AiProfileInfoWithIngredients {
  return {
    profileType: profile.profileType,
    profileId: profile.profileId,
    displayName: profile.displayName,
    allergenDetections: [],
    restrictionDetections: [],
    traceDetections: [],
    ingredients: [],
    overallSummary: null,
    canIHaveThis: {
      can: false,
      status: 'no',
      reason:
        'I cannot confirm this product is suitable for you because profile-specific AI analysis was not returned.',
    },
    uncertaintyFlags: [
      {
        type: 'low_confidence',
        message: 'AI did not return profile analysis for this profile.',
      },
    ],
  };
}
