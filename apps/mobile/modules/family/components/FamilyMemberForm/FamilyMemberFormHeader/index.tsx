import { View, Text } from 'react-native';
import { BackButton } from '../../../../../shared/components/BackButton';
import { FAMILY_MEMBER_STEP_COUNT } from '../../../stores/familyMemberFormStore';

interface FamilyMemberFormHeaderProps {
  step: number;
}

export function FamilyMemberFormHeader({ step }: FamilyMemberFormHeaderProps) {
  const progress = `${((step + 1) / FAMILY_MEMBER_STEP_COUNT) * 100}%` as const;

  return (
    <View className="px-4 pb-4 pt-1">
      <View className="relative min-h-[44px] items-center justify-center">
        <View className="absolute left-0 top-0">
          <BackButton />
        </View>

        <View className="mt-4 self-center">
          <Text className="text-center text-[14px] text-neutrals-600">
            Add family member
          </Text>
          <View className="h-1 w-[100px] mx-auto mt-2 overflow-hidden rounded-full bg-gray-200">
            <View className="h-full rounded-full bg-primary-700" style={{ width: progress }} />
          </View>
        </View>
      </View>

    </View>
  );
}
