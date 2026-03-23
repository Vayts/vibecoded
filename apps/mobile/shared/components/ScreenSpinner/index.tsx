import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '../../constants/colors';

export function ScreenSpinner() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}
