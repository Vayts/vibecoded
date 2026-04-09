import { ActivityIndicator, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { CustomLoader } from '../../../../shared/components/CustomLoader';

interface PersonalAnalysisLoaderProps {
  title?: string;
  description?: string;
  withTopMargin?: boolean;
}

export function PersonalAnalysisLoader({
  title = 'Analyzing product...',
  description = 'We\'re scoring this product for your profile.',
  withTopMargin = true,
}: PersonalAnalysisLoaderProps) {
  return (
    <View
      className={`items-center rounded-xl border border-gray-100 bg-white px-6 py-2 ${withTopMargin ? 'mt-4' : ''}`}
    >
      <CustomLoader size="sm" isReversed/>
      <Typography className="mt-2 text-center text-md font-bold text-gray-900">
        {title}
      </Typography>
      <Typography variant="bodySecondary" className="text-center leading-6 text-gray-600">
        {description}
      </Typography>
    </View>
  );
}
