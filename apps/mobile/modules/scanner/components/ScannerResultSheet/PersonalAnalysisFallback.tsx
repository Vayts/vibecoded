import { Pressable, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';

interface PersonalAnalysisFallbackProps {
  onRetry?: () => void;
}

export function PersonalAnalysisFallback({ onRetry }: PersonalAnalysisFallbackProps) {
  return (
    <View className="mt-4 rounded-xl border border-gray-100 bg-white px-6 py-8">
      <Typography variant="sectionTitle" className="text-center text-gray-900">
        Personal analysis unavailable
      </Typography>
      <Typography variant="bodySecondary" className="mt-2 text-center leading-6 text-gray-600">
        Please try again in a moment.
      </Typography>
      {onRetry ? (
        <Pressable accessibilityRole="button" className="mt-4 self-center" onPress={onRetry}>
          <Typography variant="link">Retry</Typography>
        </Pressable>
      ) : null}
    </View>
  );
}
