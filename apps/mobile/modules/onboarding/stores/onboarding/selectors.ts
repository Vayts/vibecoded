import { onboardingRequestSchema, type OnboardingRequest } from '@acme/shared';
import type { OnboardingDraft, OnboardingStore } from './types';

export const selectOnboardingStep = (state: OnboardingStore) => state.step;
export const selectOnboardingDraft = (state: OnboardingStore) => state.draft;
export const selectCurrentStepValid = (state: OnboardingStore) =>
  isOnboardingStepValid(state.step, state.draft);

export const isOnboardingStepValid = (step: number, draft: OnboardingDraft): boolean => {
  if (step === 0) {
    return draft.mainGoal !== null;
  }

  return true;
};

export const normalizeDraftToPayload = (draft: OnboardingDraft): OnboardingRequest => {
  if (!draft.mainGoal) {
    throw new Error('Please choose a main goal to continue');
  }

  return onboardingRequestSchema.parse({
    mainGoal: draft.mainGoal,
    restrictions: draft.restrictions,
    allergies: draft.allergies,
    otherAllergiesText: draft.allergies.includes('OTHER')
      ? draft.otherAllergiesText.trim() || null
      : null,
    nutritionPriorities: draft.nutritionPriorities,
  });
};
