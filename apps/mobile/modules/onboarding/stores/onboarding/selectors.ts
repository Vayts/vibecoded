import { onboardingRequestSchema, type OnboardingRequest } from '@acme/shared';
import type { OnboardingDraft, OnboardingStore } from './types';

const NON_NEGATIVE_INTEGER_PATTERN = /^\d+$/;

export const selectOnboardingStep = (state: OnboardingStore) => state.step;
export const selectOnboardingDraft = (state: OnboardingStore) => state.draft;
export const selectCurrentStepValid = (state: OnboardingStore) =>
  isOnboardingStepValid(state.step, state.draft);

export type GoalField = 'calorieGoal' | 'proteinGoal' | 'carbGoal' | 'fatGoal';
export type GoalFieldErrors = Partial<Record<GoalField, string>>;

export const getAdvancedGoalErrors = (draft: OnboardingDraft): GoalFieldErrors => {
  const fields: GoalField[] = ['calorieGoal', 'proteinGoal', 'carbGoal', 'fatGoal'];

  return fields.reduce<GoalFieldErrors>((errors, field) => {
    const value = draft[field].trim();
    if (!value) {
      return errors;
    }

    if (!NON_NEGATIVE_INTEGER_PATTERN.test(value)) {
      errors[field] = 'Use a whole number of 0 or more';
    }

    return errors;
  }, {});
};

export const isOnboardingStepValid = (step: number, draft: OnboardingDraft): boolean => {
  if (step === 0) {
    return draft.mainGoal !== null;
  }

  if (step === 4) {
    return Object.keys(getAdvancedGoalErrors(draft)).length === 0;
  }

  return true;
};

const toNullableInteger = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return Number.parseInt(trimmed, 10);
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
    calorieGoal: toNullableInteger(draft.calorieGoal),
    proteinGoal: toNullableInteger(draft.proteinGoal),
    carbGoal: toNullableInteger(draft.carbGoal),
    fatGoal: toNullableInteger(draft.fatGoal),
  });
};
