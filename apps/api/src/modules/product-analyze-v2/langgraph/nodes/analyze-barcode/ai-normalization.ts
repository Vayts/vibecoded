import { FALLBACK_ROLE } from '../../../constants/product-roles.constants.js';
import type { ProfileInputForScoring } from '../../../types/scoring.types.js';
import { normalizeOpenFoodFactsProduct } from '../../../utils/normalize-open-food-facts-product.util.js';
import type {
  AiAnalyzeV2Output,
  AiProfileInfoWithIngredients,
  ValidatedAiAnalyzeV2Result,
} from './ai-contracts.js';
import { buildFallbackProfileInfo } from './ai-fallbacks.js';
import { normalizeAiProfileInfo } from './ai-profile-normalization.js';
import {
  buildTraceGroundingValues,
  normalizeAiEnglishProductName,
} from './ai-text-normalization.js';
import {
  createProductAnalyzeV2Logger,
  formatLogContext,
} from '../../../utils/product-analyze-v2-logger.util.js';

const logger = createProductAnalyzeV2Logger('ai-normalization');

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

    const normalizedProfile = normalizeAiProfileInfo({
      aiProfile,
      profile,
      traceGroundingValues,
    });

    logDroppedDetectionCounts(profile, aiProfile, normalizedProfile);

    return normalizedProfile;
  });

  return {
    product: {
      isFoodProduct: raw.product.isFoodProduct,
      englishName: normalizeAiEnglishProductName(raw.product.englishName, product.name),
      role: raw.product.role,
      confidence: raw.product.confidence,
      evidence: raw.product.evidence,
    },
    profileInfo: validatedProfileInfo,
  };
}

const logDroppedDetectionCounts = (
  profile: ProfileInputForScoring,
  rawProfile: NonNullable<AiAnalyzeV2Output['profileInfo'][number]>,
  normalizedProfile: ValidatedAiAnalyzeV2Result['profileInfo'][number],
): void => {
  const rawDetectedAllergens = (rawProfile.allergenDetections ?? []).filter(
    (detection) => detection.detected,
  );
  const droppedAllergenCount =
    rawDetectedAllergens.length - normalizedProfile.allergenDetections.length;
  const droppedRestrictionCount =
    (rawProfile.restrictionDetections ?? []).length -
    normalizedProfile.restrictionDetections.length;
  const droppedTraceDetectionCount =
    (rawProfile.traceDetections ?? []).length - normalizedProfile.traceDetections.length;

  if (
    droppedAllergenCount <= 0 &&
    droppedRestrictionCount <= 0 &&
    droppedTraceDetectionCount <= 0
  ) {
    return;
  }

  logger.warn(
    `Dropped invalid or out-of-scope AI detections ${formatLogContext({
      profileType: profile.profileType,
      droppedAllergenCount,
      droppedRestrictionCount,
      droppedTraceDetectionCount,
    })}`,
  );
};

export { buildFallbackProfileInfo } from './ai-fallbacks.js';
