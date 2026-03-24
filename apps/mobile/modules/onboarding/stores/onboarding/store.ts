import { create } from 'zustand';
import type { OnboardingStore } from './types';
import { createInitialOnboardingDraft, REVIEW_STEP_INDEX } from './types';

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  step: 0,
  draft: createInitialOnboardingDraft(),

  setStep: (step) => set({ step: Math.max(0, Math.min(REVIEW_STEP_INDEX, step)) }),
  nextStep: () => set((state) => ({ step: Math.min(REVIEW_STEP_INDEX, state.step + 1) })),
  prevStep: () => set((state) => ({ step: Math.max(0, state.step - 1) })),

  setMainGoal: (value) => set((state) => ({ draft: { ...state.draft, mainGoal: value } })),

  toggleRestriction: (value) =>
    set((state) => {
      const exists = state.draft.restrictions.includes(value);
      return {
        draft: {
          ...state.draft,
          restrictions: exists
            ? state.draft.restrictions.filter((item) => item !== value)
            : [...state.draft.restrictions, value],
        },
      };
    }),

  toggleAllergy: (value) =>
    set((state) => {
      const exists = state.draft.allergies.includes(value);
      const allergies = exists
        ? state.draft.allergies.filter((item) => item !== value)
        : [...state.draft.allergies, value];

      return {
        draft: {
          ...state.draft,
          allergies,
          otherAllergiesText: allergies.includes('OTHER') ? state.draft.otherAllergiesText : '',
        },
      };
    }),

  setOtherAllergiesText: (value) =>
    set((state) => ({ draft: { ...state.draft, otherAllergiesText: value } })),

  toggleNutritionPriority: (value) =>
    set((state) => {
      const exists = state.draft.nutritionPriorities.includes(value);
      return {
        draft: {
          ...state.draft,
          nutritionPriorities: exists
            ? state.draft.nutritionPriorities.filter((item) => item !== value)
            : [...state.draft.nutritionPriorities, value],
        },
      };
    }),

  setCalorieGoal: (value) => set((state) => ({ draft: { ...state.draft, calorieGoal: value } })),
  setProteinGoal: (value) => set((state) => ({ draft: { ...state.draft, proteinGoal: value } })),
  setCarbGoal: (value) => set((state) => ({ draft: { ...state.draft, carbGoal: value } })),
  setFatGoal: (value) => set((state) => ({ draft: { ...state.draft, fatGoal: value } })),

  hydrateFromServer: (data) =>
    set({
      step: 0,
      draft: {
        mainGoal: data.mainGoal,
        restrictions: data.restrictions,
        allergies: data.allergies,
        otherAllergiesText: data.otherAllergiesText ?? '',
        nutritionPriorities: data.nutritionPriorities,
        calorieGoal: data.calorieGoal?.toString() ?? '',
        proteinGoal: data.proteinGoal?.toString() ?? '',
        carbGoal: data.carbGoal?.toString() ?? '',
        fatGoal: data.fatGoal?.toString() ?? '',
      },
    }),

  resetOnboardingDraft: () =>
    set({
      step: 0,
      draft: createInitialOnboardingDraft(),
    }),
}));
