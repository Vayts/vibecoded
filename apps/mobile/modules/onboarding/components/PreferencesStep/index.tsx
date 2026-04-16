import { Info } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { COLORS } from '../../../../shared/constants/colors';
import { PreferencesField } from '../OnboardingFields';

export function PreferencesStep() {
  return (
    <View>
      <Text className="text-[26px] font-bold text-neutral-900">What do you prefer?</Text>
      <Text className="mt-3 text-[16px] text-gray-500">
        Soft preferences that influence ranking but don't hard-exclude items.
      </Text>
      <View className="mt-4 flex-row items-center gap-1">
        <Info size={16} color={COLORS.primary700} />
        <Text className="font-semibold text-primary-700">Select all that apply, or skip this step</Text>
      </View>
      <View className="mt-6">
        <PreferencesField />
      </View>
    </View>
  );
}
