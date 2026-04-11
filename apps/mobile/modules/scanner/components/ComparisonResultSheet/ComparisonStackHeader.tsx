import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../../../shared/components/BackButton';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface ComparisonStackHeaderProps {
  onBackPress: () => void;
}

export function ComparisonStackHeader({ onBackPress }: ComparisonStackHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: COLORS.appBackground }}>
      <View className="flex-row items-center justify-between bg-background px-4 py-2">
        <BackButton
          accessibilityLabel="Close comparison results"
          onPress={onBackPress}
        />
        <Typography variant="headerTitle" className="flex-1 text-center text-[19px]">
          Comparison results
        </Typography>
        <View className="h-11 w-11" />
      </View>
    </View>
  );
}