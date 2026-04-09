import { View } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

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
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <View className="w-full rounded-xl border border-gray-100 bg-gray-50 px-6 py-8">
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <ShieldAlert color={COLORS.warning} size={28} />
        </View>
        <Typography variant="pageTitle" className="mb-3">
          {title}
        </Typography>
        <Typography variant="bodySecondary" className="mb-6 leading-6">
          {description}
        </Typography>
        <Button fullWidth label={buttonLabel} onPress={onPress} />
      </View>
    </View>
  );
}
