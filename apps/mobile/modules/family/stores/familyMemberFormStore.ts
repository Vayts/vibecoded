import type { CreateFamilyMemberRequest, FamilyMember } from '@acme/shared';
import type { MainGoal, Restriction, Allergy, NutritionPriority } from '../../onboarding/stores/onboarding/types';
import { create } from 'zustand';

export interface FamilyMemberDraft {
  name: string;
  avatarUrl: string | null;
  mainGoal: MainGoal | null;
  restrictions: Restriction[];
  allergies: Allergy[];
  otherAllergiesText: string;
  nutritionPriorities: NutritionPriority[];
}

export const FAMILY_MEMBER_STEP_COUNT = 6;
export const FAMILY_MEMBER_REVIEW_STEP = 5;

const createInitialDraft = (): FamilyMemberDraft => ({
  name: '',
  avatarUrl: null,
  mainGoal: null,
  restrictions: [],
  allergies: [],
  otherAllergiesText: '',
  nutritionPriorities: [],
});

interface FamilyMemberFormStore {
  memberId: string | null;
  step: number;
  draft: FamilyMemberDraft;
  setDraft: (draft: FamilyMemberDraft) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setName: (name: string) => void;
  setAvatarUrl: (avatarUrl: string | null) => void;
  setMainGoal: (goal: MainGoal | null) => void;
  toggleRestriction: (value: Restriction) => void;
  toggleAllergy: (value: Allergy) => void;
  setOtherAllergiesText: (text: string) => void;
  toggleNutritionPriority: (value: NutritionPriority) => void;
  hydrateFromMember: (member: FamilyMember) => void;
  reset: () => void;
  toPayload: () => CreateFamilyMemberRequest;
}

export const useFamilyMemberFormStore = create<FamilyMemberFormStore>((set, get) => ({
  memberId: null,
  step: 0,
  draft: createInitialDraft(),

  setDraft: (draft) => set({ draft }),

  setStep: (step) => set({ step: Math.max(0, Math.min(FAMILY_MEMBER_REVIEW_STEP, step)) }),
  nextStep: () => set((s) => ({ step: Math.min(FAMILY_MEMBER_REVIEW_STEP, s.step + 1) })),
  prevStep: () => set((s) => ({ step: Math.max(0, s.step - 1) })),

  setName: (name) => set((s) => ({ draft: { ...s.draft, name } })),

  setAvatarUrl: (avatarUrl) => set((s) => ({ draft: { ...s.draft, avatarUrl } })),

  setMainGoal: (goal) => set((s) => ({ draft: { ...s.draft, mainGoal: goal } })),

  toggleRestriction: (value) =>
    set((s) => {
      const exists = s.draft.restrictions.includes(value);
      return {
        draft: {
          ...s.draft,
          restrictions: exists
            ? s.draft.restrictions.filter((r) => r !== value)
            : [...s.draft.restrictions, value],
        },
      };
    }),

  toggleAllergy: (value) =>
    set((s) => {
      const exists = s.draft.allergies.includes(value);
      const allergies = exists
        ? s.draft.allergies.filter((a) => a !== value)
        : [...s.draft.allergies, value];
      return {
        draft: {
          ...s.draft,
          allergies,
          otherAllergiesText: allergies.includes('OTHER') ? s.draft.otherAllergiesText : '',
        },
      };
    }),

  setOtherAllergiesText: (text) => set((s) => ({ draft: { ...s.draft, otherAllergiesText: text } })),

  toggleNutritionPriority: (value) =>
    set((s) => {
      const exists = s.draft.nutritionPriorities.includes(value);
      return {
        draft: {
          ...s.draft,
          nutritionPriorities: exists
            ? s.draft.nutritionPriorities.filter((p) => p !== value)
            : [...s.draft.nutritionPriorities, value],
        },
      };
    }),

  hydrateFromMember: (member) =>
    set({
      memberId: member.id,
      step: 0,
      draft: {
        name: member.name,
        avatarUrl: member.avatarUrl,
        mainGoal: (member.mainGoal as MainGoal | null) ?? null,
        restrictions: (member.restrictions as Restriction[]) ?? [],
        allergies: (member.allergies as Allergy[]) ?? [],
        otherAllergiesText: member.otherAllergiesText ?? '',
        nutritionPriorities: (member.nutritionPriorities as NutritionPriority[]) ?? [],
      },
    }),

  reset: () => set({ memberId: null, step: 0, draft: createInitialDraft() }),

  toPayload: () => {
    const { draft } = get();
    return {
      name: draft.name.trim(),
      avatarUrl: draft.avatarUrl,
      mainGoal: draft.mainGoal ?? undefined,
      restrictions: draft.restrictions,
      allergies: draft.allergies,
      otherAllergiesText: draft.allergies.includes('OTHER')
        ? draft.otherAllergiesText.trim() || null
        : null,
      nutritionPriorities: draft.nutritionPriorities,
    };
  },
}));

export const isNameStepValid = (draft: FamilyMemberDraft): boolean => {
  const trimmedName = draft.name.trim();

  return trimmedName.length > 0 && trimmedName.length <= 30;
};
