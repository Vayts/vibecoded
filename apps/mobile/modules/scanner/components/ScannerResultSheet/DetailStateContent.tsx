import { ActivityIndicator, View } from 'react-native';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

export interface ProductResultDetailState {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

interface DetailStateContentProps {
  detailState?: ProductResultDetailState;
}

export function DetailStateContent({ detailState }: DetailStateContentProps) {
  if (!detailState?.isLoading && !detailState?.isError) {
    return null;
  }

  if (detailState.isLoading) {
    return (
      <View className="items-center justify-center px-6 py-12">
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Typography variant="bodySecondary" className="mt-3 text-gray-500">
          Loading product info…
        </Typography>
      </View>
    );
  }

  return (
    <View className="px-4 py-8">
      <Typography variant="sectionTitle" className="text-center">
        Something went wrong
      </Typography>
      <Typography variant="bodySecondary" className="mt-2 text-center">
        {detailState.errorMessage ?? 'Failed to load scan details'}
      </Typography>
      {detailState.onRetry ? (
        <View className="mt-4 items-center">
          <Button label="Retry" onPress={() => void detailState.onRetry?.()} />
        </View>
      ) : null}
    </View>
  );
}