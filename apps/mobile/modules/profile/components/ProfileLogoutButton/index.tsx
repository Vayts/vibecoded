import { LogOut } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface ProfileLogoutButtonProps {
  disabled?: boolean;
  onPress: () => void;
}

export function ProfileLogoutButton({ disabled = false, onPress }: ProfileLogoutButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Log out"
      className="min-h-[52px] rounded-full border border-neutrals-300 px-5 py-4"
      style={{
        opacity: disabled ? 0.4 : 1,
      }}
      disabled={disabled}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-center">
        <LogOut color={COLORS.danger800} size={18} strokeWidth={2} />
        <Typography variant="button" className="ml-2 text-danger-800">
          Log out
        </Typography>
      </View>
    </TouchableOpacity>
  );
}
