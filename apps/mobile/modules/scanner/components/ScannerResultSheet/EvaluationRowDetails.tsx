import type { ScoreReason } from '@acme/shared';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';

interface EvaluationRowDetailsProps {
  item: ScoreReason;
}

export function EvaluationRowDetails({ item }: EvaluationRowDetailsProps) {
  return (
    <View className="mt-2 border-gray-200">
      {item.description ? (
        <Typography variant="bodySecondary" className="leading-6 text-gray-600">
          {item.description}
        </Typography>
      ) : null}
    </View>
  );
}
