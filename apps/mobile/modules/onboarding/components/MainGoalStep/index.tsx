import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { useOnboardingStore } from '../../stores/onboarding/store';
import { selectOnboardingDraft } from '../../stores/onboarding/selectors';
import { MAIN_GOAL_OPTIONS } from '../options';
import { SelectableChip } from '../SelectableChip';

export function MainGoalStep() {
  const draft = useOnboardingStore(selectOnboardingDraft);
  const setMainGoal = useOnboardingStore((state) => state.setMainGoal);

  return (
    <View>
      <Typography variant="pageTitle">What is your main goal?</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
        Pick the primary outcome you want the app to optimize for.
      </Typography>

      <View className="mt-6 gap-3">
        {MAIN_GOAL_OPTIONS.map((option) => (
          <SelectableChip
            key={option.value}
            label={option.label}
            description={option.description}
            selected={draft.mainGoal === option.value}
            onPress={() => setMainGoal(option.value)}
          />
        ))}
      </View>

      {!draft.mainGoal ? (
        <Typography variant="caption" className="mt-4 text-blue-600">
          Choose one option to continue.
        </Typography>
      ) : null}
    </View>
  );
}
