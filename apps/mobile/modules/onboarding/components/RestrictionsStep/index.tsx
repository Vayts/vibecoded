import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { RestrictionsField } from '../OnboardingFields';

export function RestrictionsStep() {
  return (
    <View>
      <Typography variant="pageTitle">Any dealbreakers?</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
        These are hard constraints. We will exclude anything that violates them.
      </Typography>

      <RestrictionsField />
    </View>
  );
}
