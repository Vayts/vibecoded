import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { MainGoalField, MainGoalHint } from '../OnboardingFields';

export function MainGoalStep() {
  return (
    <View>
      <Typography variant="pageTitle">What is your main goal?</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
        Pick the primary outcome you want the app to optimize for.
      </Typography>

      <MainGoalField />
      <MainGoalHint />
    </View>
  );
}
