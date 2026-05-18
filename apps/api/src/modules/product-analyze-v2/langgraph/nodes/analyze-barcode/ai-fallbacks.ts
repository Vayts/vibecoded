import type { ProfileInputForScoring } from '../../../types/scoring.types.js';
import type { AiProfileInfoWithIngredients } from './ai-contracts.js';

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
