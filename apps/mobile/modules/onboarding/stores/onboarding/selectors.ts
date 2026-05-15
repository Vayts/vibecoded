import { onboardingRequestSchema, type OnboardingRequest } from '@acme/shared';
import {
  getOtherAllergyValidationError,
  normalizeOtherAllergyText,
} from '../../../../shared/lib/validation/otherAllergy';
import type { OnboardingDraft, OnboardingStore } from './types';

export const selectOnboardingStep = (state: OnboardingStore) => state.step;
export const selectOnboardingDraft = (state: OnboardingStore) => state.draft;
export const selectCurrentStepValid = (state: OnboardingStore) =>
  isOnboardingStepValid(state.step, state.draft);

export const isOnboardingStepValid = (step: number, draft: OnboardingDraft): boolean => {
  if (step === 0) {
    return draft.mainGoal !== null;
  }

  if (step === 2) {
    return getOtherAllergyValidationError(draft) === null;
  }

  return true;
};

export const normalizeDraftToPayload = (draft: OnboardingDraft): OnboardingRequest => {
  if (!draft.mainGoal) {
    throw new Error('Please choose a main goal to continue');
  }

  const otherAllergyError = getOtherAllergyValidationError(draft);
  if (otherAllergyError) {
    throw new Error(otherAllergyError);
  }

  return onboardingRequestSchema.parse({
    mainGoal: draft.mainGoal,
    restrictions: draft.restrictions,
    allergies: draft.allergies,
    otherAllergiesText: normalizeOtherAllergyText(draft),
    nutritionPriorities: draft.nutritionPriorities,
  });
};
