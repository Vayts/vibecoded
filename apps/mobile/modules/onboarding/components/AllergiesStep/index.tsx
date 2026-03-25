import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { AllergiesField } from '../OnboardingFields';

export function AllergiesStep() {
  return (
    <View>
      <Typography variant="pageTitle">Any allergies or intolerances?</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
        Add any ingredients you want us to avoid. Leave this blank if there are no restrictions.
      </Typography>

      <AllergiesField />
    </View>
  );
}
