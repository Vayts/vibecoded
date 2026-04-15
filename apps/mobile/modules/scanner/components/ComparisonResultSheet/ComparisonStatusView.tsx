import { View } from 'react-native';
import { CustomLoader } from '../../../../shared/components/CustomLoader';
import { Typography } from '../../../../shared/components/Typography';

interface ComparisonStatusViewProps {
  description: string;
  showLoader?: boolean;
  title?: string;
}

export function ComparisonStatusView({
  description,
  showLoader = false,
  title,
}: ComparisonStatusViewProps) {
  return (
    <View className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-8 py-12">
        {showLoader ? <CustomLoader size="md" isReversed /> : null}
        {title ? (
          <Typography variant="sectionTitle" className="text-center">
            {title}
          </Typography>
        ) : null}
        <Typography
          variant="bodySecondary"
          className={`${showLoader || title ? 'mt-3' : ''} text-center text-gray-500`}
        >
          {description}
        </Typography>
      </View>
    </View>
  );
}