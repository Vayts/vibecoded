import type { ProductAnalysisResult } from '@acme/shared';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { formatRatingLabel, getRatingTone } from './evaluationHelpers';

interface OverallScoreCardProps {
  evaluation: ProductAnalysisResult;
}

export function OverallScoreCard({ evaluation }: OverallScoreCardProps) {
  const tone = getRatingTone(evaluation.rating);

  return (
    <View
      className="mt-4 rounded-xl border bg-white px-4 py-4"
      style={{
        borderColor: tone.borderColor,
      }}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View>
          <Typography variant="fieldLabel" style={{ color: tone.mutedTextColor }}>
            Overall score
          </Typography>
          <Typography variant="bodySecondary" className="mt-1" style={{ color: tone.textColor }}>
            {formatRatingLabel(evaluation.rating)}
          </Typography>
        </View>

        <View className="items-end">
          <Typography variant="pageTitle" style={{ color: tone.textColor }}>
            {evaluation.overallScore}/100
          </Typography>
        </View>
      </View>
    </View>
  );
}
