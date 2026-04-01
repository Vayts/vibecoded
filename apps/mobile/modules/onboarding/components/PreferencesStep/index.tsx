import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { PreferencesField } from '../OnboardingFields';

export function PreferencesStep() {
  return (
    <View>
      <Typography variant="pageTitle">What do you prefer?</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
        These are soft preferences. They influence ranking, but they do not hard-exclude items.
      </Typography>

      <PreferencesField />
    </View>
  );
}
