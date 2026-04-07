import { ActivityIndicator, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface PersonalAnalysisLoaderProps {
  title?: string;
  description?: string;
}

export function PersonalAnalysisLoader({
  title = 'Analyzing product...',
  description = 'We\'re scoring this product for your profile.',
}: PersonalAnalysisLoaderProps) {
  return (
    <View className="mt-4 items-center rounded-xl border border-gray-100 bg-white px-6 py-8">
      <ActivityIndicator color={COLORS.primary} size="small" />
      <Typography variant="sectionTitle" className="mt-4 text-center text-gray-900">
        {title}
      </Typography>
      <Typography variant="bodySecondary" className="mt-2 text-center leading-6 text-gray-600">
        {description}
      </Typography>
    </View>
  );
}
