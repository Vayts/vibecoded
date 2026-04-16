import { View } from 'react-native';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScannerPermissionStateProps {
  title: string;
  description: string;
  buttonLabel: string;
  onPress: () => void;
}

export function ScannerPermissionState({
  title,
  description,
  buttonLabel,
  onPress,
}: ScannerPermissionStateProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 items-center justify-center bg-background px-4" style={{ paddingBottom: insets.bottom + 16, paddingTop: insets.top + 16 }}>
      <View className="w-full flex-1 rounded-xl items-center justify-center border border-gray-100 bg-gray-50 px-4 py-8">
        <View
        className="w-24 h-24 rounded-md bg-gray-100 mb-6"
        />
        <Typography variant="hero" className="text-center">
          {title}
        </Typography>
        <Typography className="text-center text-[16px] mt-4 px-4">
          {description}
        </Typography>
      </View>
      <Button fullWidth label={buttonLabel} onPress={onPress} />
    </View>
  );
}