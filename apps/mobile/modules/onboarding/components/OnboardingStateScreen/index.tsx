import { ActivityIndicator, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface OnboardingStateScreenProps {
  title: string;
  description: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

export function OnboardingStateScreen({
  title,
  description,
  loading = false,
  actionLabel,
  onAction,
}: OnboardingStateScreenProps) {
  return (
    <View className="flex-1 justify-center bg-background px-6">
      <View className="rounded-xl border border-gray-100 bg-white px-6 py-8 shadow-sm">
        <View className="mb-5 h-14 w-14 items-center justify-center self-center rounded-xl bg-blue-50">
          {loading ? (
            <ActivityIndicator color={COLORS.primary} size="small" />
          ) : (
            <AlertCircle color={COLORS.primary} size={24} />
          )}
        </View>
        <Typography variant="pageTitle" className="text-center">
          {title}
        </Typography>
        <Typography variant="bodySecondary" className="mt-3 text-center leading-6 text-gray-500">
          {description}
        </Typography>
        {actionLabel && onAction ? (
          <View className="mt-6">
            <Button fullWidth label={actionLabel} onPress={onAction} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
