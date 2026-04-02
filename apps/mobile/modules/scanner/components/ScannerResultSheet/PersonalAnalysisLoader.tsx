import { ActivityIndicator, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

export function PersonalAnalysisLoader() {
  return (
    <View className="mt-4 items-center rounded-xl border border-gray-100 bg-white px-6 py-8">
      <ActivityIndicator color={COLORS.primary} size="small" />
      <Typography variant="sectionTitle" className="mt-4 text-center text-gray-900">
        Analyzing your fit...
      </Typography>
      <Typography variant="bodySecondary" className="mt-2 text-center leading-6 text-gray-600">
        We&apos;re checking whether this product matches your profile.
      </Typography>
    </View>
  );
}
