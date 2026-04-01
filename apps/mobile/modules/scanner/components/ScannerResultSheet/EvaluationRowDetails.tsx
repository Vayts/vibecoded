import type { ProductAnalysisItem } from '@acme/shared';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface EvaluationRowDetailsProps {
  item: ProductAnalysisItem;
}

export function EvaluationRowDetails({ item }: EvaluationRowDetailsProps) {
  const triggers = item.triggerIngredients;
  const detailText = item.overview;

  return (
    <View className="mt-2 border-gray-200">
      {detailText ? (
        <Typography variant="bodySecondary" className="leading-6 text-gray-600">
          {detailText}
        </Typography>
      ) : null}
      {triggers && triggers.length > 0 ? (
        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {triggers.map((ingredient) => (
            <View
              key={ingredient}
              style={{
                backgroundColor: item.severity === 'bad' ? COLORS.dangerSoft : COLORS.warningSoft,
                borderColor: item.severity === 'bad' ? COLORS.dangerBorder : COLORS.warningBorder,
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Typography
                variant="caption"
                style={{ color: item.severity === 'bad' ? COLORS.danger : COLORS.warning }}
                className="font-medium"
              >
                {ingredient}
              </Typography>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
