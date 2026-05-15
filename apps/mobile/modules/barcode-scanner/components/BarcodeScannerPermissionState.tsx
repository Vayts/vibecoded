import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CameraMascot from '../../../assets/icons/mascot/camera-access-mascot.svg';
import { BackButton } from '../../../shared/components/BackButton';
import { Button } from '../../../shared/components/Button';
import { Typography } from '../../../shared/components/Typography';

interface BarcodeScannerPermissionStateProps {
  title: string;
  description: string;
  buttonLabel: string;
  onPress: () => void;
  onClose: () => void;
}

export function BarcodeScannerPermissionState({
  title,
  description,
  buttonLabel,
  onPress,
  onClose,
}: BarcodeScannerPermissionStateProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-background px-4"
      style={{ paddingBottom: insets.bottom + 16, paddingTop: insets.top + 12 }}
    >
      <View className="min-h-[44px] w-full justify-center">
        <BackButton icon="close" accessibilityLabel="Close scanner" onPress={onClose} />
      </View>

      <View className="w-full flex-1 items-center justify-center px-4 py-8">
        <View className="mb-6">
          <CameraMascot height={120} width={120} />
        </View>
        <Typography variant="hero" className="text-center">
          {title}
        </Typography>
        <Typography className="mt-4 px-4 text-center text-[16px]">{description}</Typography>
      </View>

      <View className="mt-4 w-full">
        <Button fullWidth label={buttonLabel} onPress={onPress} />
      </View>
    </View>
  );
}

