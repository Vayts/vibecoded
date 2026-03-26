import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';

interface BackButtonProps {
  variant?: 'light' | 'dark';
  icon?: 'chevron' | 'close';
  accessibilityLabel?: string;
  onPress?: () => void;
}

export function BackButton({
  variant = 'light',
  icon = 'chevron',
  accessibilityLabel = 'Go back',
  onPress,
}: BackButtonProps) {
  const router = useRouter();

  const handlePress = onPress ?? (() => router.back());
  const isDark = variant === 'dark';
  const iconColor = isDark ? COLORS.white : COLORS.gray800;
  const IconComponent = icon === 'close' ? X : ChevronLeft;
  const iconSize = icon === 'close' ? 20 : 24;

  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      activeOpacity={0.7}
      className={`h-11 w-11 items-center justify-center rounded-full ${isDark ? 'bg-black/50' : ''}`}
      onPress={handlePress}
    >
      <IconComponent color={iconColor} size={iconSize} />
    </TouchableOpacity>
  );
}
