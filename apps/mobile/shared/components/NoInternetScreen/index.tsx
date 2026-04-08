import { View } from 'react-native';
import { Button } from '../Button';
import { Typography } from '../Typography';

interface NoInternetScreenProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

export function NoInternetScreen({ onRetry, isRetrying = false }: NoInternetScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <View className="w-full max-w-sm rounded-3xl border border-gray-200 bg-gray-50 px-6 py-8">
        <Typography variant="hero" className="text-center text-gray-900">
          No internet connection
        </Typography>

        <Typography variant="body" className="mt-3 text-center text-gray-600">
          Check your connection and try again to continue using the app.
        </Typography>

        <View className="mt-8">
          <Button
            label="Retry"
            fullWidth
            loading={isRetrying}
            onPress={onRetry}
          />
        </View>
      </View>
    </View>
  );
}