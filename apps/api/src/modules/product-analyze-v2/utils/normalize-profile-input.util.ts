import type { ProfileInputForScoring } from '../types/scoring.types.js';

export function normalizeProfileInput(profile: ProfileInputForScoring): ProfileInputForScoring {
  const hasOtherAllergy = profile.allergies.includes('OTHER');
  const trimmedOtherAllergiesText = profile.otherAllergiesText?.trim() ?? '';
  const otherAllergiesText =
    hasOtherAllergy && trimmedOtherAllergiesText.length > 0 ? trimmedOtherAllergiesText : null;

  return {
    ...profile,
    allergies: otherAllergiesText
      ? profile.allergies
      : profile.allergies.filter((allergy) => allergy !== 'OTHER'),
    otherAllergiesText,
  };
}
