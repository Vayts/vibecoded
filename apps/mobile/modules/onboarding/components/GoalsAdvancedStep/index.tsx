import { View } from 'react-native';
import { Input } from '../../../../shared/components/Input';
import { Typography } from '../../../../shared/components/Typography';
import { getAdvancedGoalErrors, selectOnboardingDraft } from '../../stores/onboarding/selectors';
import { useOnboardingStore } from '../../stores/onboarding/store';

export function GoalsAdvancedStep() {
  const draft = useOnboardingStore(selectOnboardingDraft);
  const setCalorieGoal = useOnboardingStore((state) => state.setCalorieGoal);
  const setProteinGoal = useOnboardingStore((state) => state.setProteinGoal);
  const setCarbGoal = useOnboardingStore((state) => state.setCarbGoal);
  const setFatGoal = useOnboardingStore((state) => state.setFatGoal);
  const errors = getAdvancedGoalErrors(draft);

  return (
    <View>
      <Typography variant="pageTitle">Want to add macro targets?</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
        This step is optional. Add targets if you already track macros, or skip and fine-tune later.
      </Typography>

      <View className="mt-6 gap-4">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input
              error={errors.calorieGoal}
              keyboardType="number-pad"
              label="Calories"
              onChangeText={setCalorieGoal}
              placeholder="2200"
              value={draft.calorieGoal}
            />
          </View>
          <View className="flex-1">
            <Input
              error={errors.proteinGoal}
              keyboardType="number-pad"
              label="Protein (g)"
              onChangeText={setProteinGoal}
              placeholder="180"
              value={draft.proteinGoal}
            />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input
              error={errors.carbGoal}
              keyboardType="number-pad"
              label="Carbs (g)"
              onChangeText={setCarbGoal}
              placeholder="80"
              value={draft.carbGoal}
            />
          </View>
          <View className="flex-1">
            <Input
              error={errors.fatGoal}
              keyboardType="number-pad"
              label="Fat (g)"
              onChangeText={setFatGoal}
              placeholder="120"
              value={draft.fatGoal}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
