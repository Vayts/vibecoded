import type { FamilyMember } from '@acme/shared';

import {
  ALLERGY_LABELS,
  MAIN_GOAL_LABELS,
  NUTRITION_PRIORITY_LABELS,
  RESTRICTION_LABELS,
} from '../../onboarding/components/options';
import type { FamilyMemberDraft } from '../stores/familyMemberFormStore';

type FamilyMemberSource = {
  name: string;
  avatarUrl: string | null;
  mainGoal: FamilyMemberDraft['mainGoal'];
  restrictions: FamilyMemberDraft['restrictions'];
  allergies: FamilyMemberDraft['allergies'];
  otherAllergiesText: string | null;
  nutritionPriorities: FamilyMemberDraft['nutritionPriorities'];
};

const summarizeList = (values: string[], labels: Record<string, string>, emptyLabel: string) => {
  if (values.length === 0) {
    return emptyLabel;
  }

  return values.map((value) => labels[value] ?? value).join(', ');
};

const getNormalizedOtherAllergiesText = (source: FamilyMemberSource): string | null => {
  if (!source.allergies.includes('OTHER')) {
    return null;
  }

  const trimmedText = source.otherAllergiesText?.trim() ?? '';
  return trimmedText.length > 0 ? trimmedText : null;
};

const toComparableFamilyMemberValue = (source: FamilyMemberSource) => ({
  name: source.name.trim(),
  avatarUrl: source.avatarUrl,
  mainGoal: source.mainGoal ?? null,
  restrictions: source.restrictions,
  allergies: source.allergies,
  otherAllergiesText: getNormalizedOtherAllergiesText(source),
  nutritionPriorities: source.nutritionPriorities,
});

export const hasFamilyMemberDraftChanges = (
  member: FamilyMember,
  draft: FamilyMemberDraft,
): boolean => {
  return JSON.stringify(toComparableFamilyMemberValue(member)) !== JSON.stringify(
    toComparableFamilyMemberValue(draft),
  );
};

export const getFamilyMemberMainGoalSummary = (source: FamilyMemberSource): string => {
  if (!source.mainGoal) {
    return 'Choose a primary goal';
  }

  return MAIN_GOAL_LABELS[source.mainGoal] ?? source.mainGoal;
};

export const getFamilyMemberRestrictionsSummary = (source: FamilyMemberSource): string => {
  return summarizeList(
    source.restrictions,
    RESTRICTION_LABELS,
    'No hard restrictions selected',
  );
};

export const getFamilyMemberAllergiesSummary = (source: FamilyMemberSource): string => {
  const allergies = source.allergies
    .filter((allergy) => allergy !== 'OTHER')
    .map((allergy) => ALLERGY_LABELS[allergy] ?? allergy);
  const otherText = getNormalizedOtherAllergiesText(source);

  if (otherText) {
    allergies.push(otherText);
  }

  if (allergies.length === 0) {
    return 'No allergies selected';
  }

  return allergies.join(', ');
};

export const getFamilyMemberPreferencesSummary = (source: FamilyMemberSource): string => {
  return summarizeList(
    source.nutritionPriorities,
    NUTRITION_PRIORITY_LABELS,
    'No specific preferences selected',
  );
};
