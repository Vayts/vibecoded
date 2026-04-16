import { Text, View } from 'react-native';
import { MainGoalField } from '../OnboardingFields';

export function MainGoalStep() {
  return (
    <View>
      <Text className="text-[26px] font-bold text-neutral-900">What is your main goal?</Text>
      <Text className="mt-3 text-[16px] text-gray-500">
        Pick the primary outcome to optimize for.
      </Text>

      <View className="mt-6">
        <MainGoalField />
      </View>
    </View>
  );
}
