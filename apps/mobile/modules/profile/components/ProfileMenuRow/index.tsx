import { ChevronRight } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';

import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface ProfileMenuRowProps {
  label: string;
  subtitle?: string;
  destructive?: boolean;
  onPress: () => void;
  hideBorder?: boolean;
}

export function ProfileMenuRow({
  label,
  subtitle,
  destructive = false,
  onPress,
  hideBorder,
}: ProfileMenuRowProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className={`flex-row items-center border-b border-gray-200 mx-4 py-3 ${hideBorder ? 'border-b-0' : ''}`}
      onPress={onPress}
    >
      <View className="flex-1 pr-4">
        <Typography
          variant="body"
          className={destructive ? 'font-semibold text-red-600' : 'font-semibold text-gray-900'}
        >
          {label}
        </Typography>
        {subtitle ? (
          <Typography variant="bodySecondary" className="mt-1 leading-5 text-gray-500">
            {subtitle}
          </Typography>
        ) : null}
      </View>
      <ChevronRight color={destructive ? COLORS.danger : COLORS.gray400} size={18} />
    </TouchableOpacity>
  );
}
