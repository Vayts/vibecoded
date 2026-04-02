import type { OnboardingRequest, OnboardingResponse } from '@acme/shared';

export type MainGoal = OnboardingRequest['mainGoal'];
export type Restriction = OnboardingRequest['restrictions'][number];
export type Allergy = OnboardingRequest['allergies'][number];
export type NutritionPriority = OnboardingRequest['nutritionPriorities'][number];

export interface OnboardingDraft {
  mainGoal: MainGoal | null;
  restrictions: Restriction[];
  allergies: Allergy[];
  otherAllergiesText: string;
  nutritionPriorities: NutritionPriority[];
}

export interface OnboardingStore {
  step: number;
  draft: OnboardingDraft;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setMainGoal: (value: MainGoal) => void;
  toggleRestriction: (value: Restriction) => void;
  toggleAllergy: (value: Allergy) => void;
  setOtherAllergiesText: (value: string) => void;
  toggleNutritionPriority: (value: NutritionPriority) => void;
  hydrateFromServer: (data: OnboardingResponse) => void;
  resetOnboardingDraft: () => void;
}

export const ONBOARDING_STEP_COUNT = 5;
export const REVIEW_STEP_INDEX = 4;

export const createInitialOnboardingDraft = (): OnboardingDraft => ({
  mainGoal: null,
  restrictions: [],
  allergies: [],
  otherAllergiesText: '',
  nutritionPriorities: [],
});
