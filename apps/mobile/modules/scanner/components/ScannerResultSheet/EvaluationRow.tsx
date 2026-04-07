import type { ScoreReason } from '@acme/shared';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { formatScoreReasonValue, getSeverityTone } from './evaluationHelpers';
import { EvaluationRowIcon } from './EvaluationRowIcon';

interface EvaluationRowProps {
  item: ScoreReason;
}

export function EvaluationRow({ item }: EvaluationRowProps) {
  const tone = getSeverityTone(item.kind);
  const formattedValue = formatScoreReasonValue(item);

  return (
    <View className="rounded-xl border border-gray-100 bg-white px-4 py-3">
      <View className="flex-row items-center gap-4">
        <View className="flex-row flex-1 items-center gap-1">
          <EvaluationRowIcon/>

          <View className="flex-1">
            <Typography variant="body" className="font-semibold text-gray-900">
              {item.label}
            </Typography>
            <Typography variant="bodySecondary" className="leading-5 text-gray-500">
              {item.description}
            </Typography>
          </View>
        </View>

        {formattedValue ? (
          <View
            className="rounded-full border px-2.5 py-1"
            style={{ backgroundColor: tone.badgeBackgroundColor, borderColor: tone.borderColor }}
          >
            <Typography
              variant="caption"
              className="font-semibold"
              style={{ color: tone.textColor }}
            >
              {formattedValue}
            </Typography>
          </View>
        ) : null}
      </View>
    </View>
  );
}
