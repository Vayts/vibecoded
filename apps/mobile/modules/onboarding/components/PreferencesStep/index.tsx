import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { useOnboardingStore } from '../../stores/onboarding/store';
import { selectOnboardingDraft } from '../../stores/onboarding/selectors';
import { NUTRITION_PRIORITY_OPTIONS } from '../options';
import { SelectableChip } from '../SelectableChip';

export function PreferencesStep() {
  const draft = useOnboardingStore(selectOnboardingDraft);
  const toggleNutritionPriority = useOnboardingStore((state) => state.toggleNutritionPriority);

  return (
    <View>
      <Typography variant="pageTitle">What do you prefer?</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
        These are soft preferences. They influence ranking, but they do not hard-exclude items.
      </Typography>

      <View className="mt-6 gap-3">
        {NUTRITION_PRIORITY_OPTIONS.map((option) => (
          <SelectableChip
            key={option.value}
            label={option.label}
            description={option.description}
            selected={draft.nutritionPriorities.includes(option.value)}
            onPress={() => toggleNutritionPriority(option.value)}
          />
        ))}
      </View>
    </View>
  );
}
