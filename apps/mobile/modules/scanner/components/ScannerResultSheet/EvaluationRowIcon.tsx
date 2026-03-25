import type { ProductAnalysisItem } from '@acme/shared';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';

interface EvaluationRowIconProps {
  item: ProductAnalysisItem;
}

const ICON_LABELS: Record<string, string> = {
  protein: 'P',
  fiber: 'F',
  'saturated-fat': 'SF',
  sugar: 'S',
  salt: 'Na',
  calories: 'C',
  ingredients: 'I',
  nutriscore: 'N',
};

export function EvaluationRowIcon({ item }: EvaluationRowIconProps) {
  const label = ICON_LABELS[item.key] ?? item.label.slice(0, 1).toUpperCase();

  return (
    <View className="h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
      <Typography variant="caption" className="font-semibold text-gray-600">
        {label}
      </Typography>
    </View>
  );
}
