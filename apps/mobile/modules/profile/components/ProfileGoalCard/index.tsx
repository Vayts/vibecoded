import { ChevronRight, Goal } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface ProfileGoalCardProps {
  description: string;
  helperText: string;
  label: string;
  onPress: () => void;
}

export function ProfileGoalCard({ description, helperText, label, onPress }: ProfileGoalCardProps) {
  return (
    <View className="mt-3">
      <View className="overflow-hidden shadow-sm rounded-[16px] border border-gray-200 bg-white">
        <View className="flex-row items-center border-b border-gray-200 bg-gray-50 px-4 py-3">
          <Goal color={COLORS.gray500} size={16} strokeWidth={1.9} />
          <Typography variant="bodySecondary" className="ml-2 font-medium text-gray-500">
            {label}
          </Typography>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          className="min-h-[64px] flex-row items-center justify-between px-4 py-3"
          accessibilityRole="button"
          accessibilityLabel="Edit health profile"
          onPress={onPress}
        >
          <View className="flex-1 pr-4">
            <Typography variant="sectionTitle" className="text-neutrals-900">
              {description}
            </Typography>
            <Typography variant="bodySecondary" className="mt-1 text-gray-500">
              Update health profile
            </Typography>
          </View>
          <ChevronRight color={COLORS.gray500} size={18} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <Typography variant="bodySecondary" className="mt-3 px-0.5 leading-6 text-neutrals-700">
        {helperText}
      </Typography>
    </View>
  );
}
