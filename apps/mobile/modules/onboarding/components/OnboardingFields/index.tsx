import { View } from 'react-native';

import { Input } from '../../../../shared/components/Input';
import { Typography } from '../../../../shared/components/Typography';
import { selectOnboardingDraft } from '../../stores/onboarding/selectors';
import { useOnboardingStore } from '../../stores/onboarding/store';
import {
  ALLERGY_OPTIONS,
  MAIN_GOAL_OPTIONS,
  NUTRITION_PRIORITY_OPTIONS,
  RESTRICTION_OPTIONS,
} from '../options';
import { SelectableChip } from '../SelectableChip';

export function MainGoalField() {
  const draft = useOnboardingStore(selectOnboardingDraft);
  const setMainGoal = useOnboardingStore((state) => state.setMainGoal);

  return (
    <View className="gap-3">
      {MAIN_GOAL_OPTIONS.map((option) => (
        <SelectableChip
          key={option.value}
          label={option.label}
          description={option.description}
          selected={draft.mainGoal === option.value}
          onPress={() => setMainGoal(draft.mainGoal === option.value ? null : option.value)}
        />
      ))}
    </View>
  );
}

export function RestrictionsField() {
  const draft = useOnboardingStore(selectOnboardingDraft);
  const toggleRestriction = useOnboardingStore((state) => state.toggleRestriction);

  return (
    <View className="gap-3">
      {RESTRICTION_OPTIONS.map((option) => (
        <SelectableChip
          key={option.value}
          label={option.label}
          description={option.description}
          selected={draft.restrictions.includes(option.value)}
          withCheckIcon
          onPress={() => toggleRestriction(option.value)}
        />
      ))}
    </View>
  );
}

export function AllergiesField() {
  const draft = useOnboardingStore(selectOnboardingDraft);
  const toggleAllergy = useOnboardingStore((state) => state.toggleAllergy);
  const setOtherAllergiesText = useOnboardingStore((state) => state.setOtherAllergiesText);
  const hasOther = draft.allergies.includes('OTHER');

  return (
    <>
      <View className="gap-3">
        {ALLERGY_OPTIONS.map((option) => (
          <SelectableChip
            isBig
            key={option.value}
            label={option.label}
            selected={draft.allergies.includes(option.value)}
            withCheckIcon
            onPress={() => toggleAllergy(option.value)}
          />
        ))}
      </View>

      {hasOther ? (
        <View className="mt-5">
          <Input
            label="Other allergy details"
            maxLength={120}
            onChangeText={setOtherAllergiesText}
            placeholder="Tell us what to watch for"
            value={draft.otherAllergiesText}
          />
        </View>
      ) : null}
    </>
  );
}

export function PreferencesField() {
  const draft = useOnboardingStore(selectOnboardingDraft);
  const toggleNutritionPriority = useOnboardingStore((state) => state.toggleNutritionPriority);

  return (
    <View className="gap-3">
      {NUTRITION_PRIORITY_OPTIONS.map((option) => (
        <SelectableChip
          key={option.value}
          label={option.label}
          description={option.description}
          selected={draft.nutritionPriorities.includes(option.value)}
          withCheckIcon
          onPress={() => toggleNutritionPriority(option.value)}
        />
      ))}
    </View>
  );
}

export function MainGoalHint() {
  const draft = useOnboardingStore(selectOnboardingDraft);

  if (draft.mainGoal) {
    return null;
  }

  return (
    <Typography variant="caption" className="mt-4 text-blue-600">
      Choose one option to continue.
    </Typography>
  );
}
