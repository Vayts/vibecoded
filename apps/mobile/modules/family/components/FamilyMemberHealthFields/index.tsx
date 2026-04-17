import { View } from 'react-native';

import { Input } from '../../../../shared/components/Input';
import { SelectableChip } from '../../../onboarding/components/SelectableChip';
import {
  ALLERGY_OPTIONS,
  MAIN_GOAL_OPTIONS,
  NUTRITION_PRIORITY_OPTIONS,
  RESTRICTION_OPTIONS,
} from '../../../onboarding/components/options';
import { useFamilyMemberFormStore } from '../../stores/familyMemberFormStore';

export function FamilyMemberMainGoalField() {
  const draft = useFamilyMemberFormStore((state) => state.draft);
  const setMainGoal = useFamilyMemberFormStore((state) => state.setMainGoal);

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

export function FamilyMemberRestrictionsField() {
  const draft = useFamilyMemberFormStore((state) => state.draft);
  const toggleRestriction = useFamilyMemberFormStore((state) => state.toggleRestriction);

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

export function FamilyMemberAllergiesField() {
  const draft = useFamilyMemberFormStore((state) => state.draft);
  const toggleAllergy = useFamilyMemberFormStore((state) => state.toggleAllergy);
  const setOtherAllergiesText = useFamilyMemberFormStore((state) => state.setOtherAllergiesText);

  return (
    <View>
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

      {draft.allergies.includes('OTHER') ? (
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
    </View>
  );
}

export function FamilyMemberPreferencesField() {
  const draft = useFamilyMemberFormStore((state) => state.draft);
  const toggleNutritionPriority = useFamilyMemberFormStore((state) => state.toggleNutritionPriority);

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
