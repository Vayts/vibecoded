import type { ScoreReason } from '@acme/shared';
import { CircleAlert, CircleCheck } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { formatScoreReasonValue, getSeverityTone } from './evaluationHelpers';
import { EvaluationRowIcon } from './EvaluationRowIcon';
import { SheetManager } from 'react-native-actions-sheet';
import { SheetsEnum } from '../../../../shared/types/sheets';

interface EvaluationRowProps {
  item: ScoreReason;
}

export function EvaluationRow({ item }: EvaluationRowProps) {
  const tone = getSeverityTone(item.kind);
  const formattedValue = formatScoreReasonValue(item);

  const statusIcon =
    formattedValue == null
      ? item.kind === 'negative'
        ? <CircleAlert size={20} color={COLORS.danger} strokeWidth={1.8} />
        : item.kind === 'positive'
          ? <CircleCheck size={20} color={COLORS.success} strokeWidth={1.8} />
          : null
      : null;

  const handleOpenSheet = () => {
    void SheetManager.show(SheetsEnum.BasedOnYourProfileSheet, {
      payload: {
        title: item.label || 'Evaluation',
      },
    });
  }

  return (
    <View className="rounded-xl border border-gray-100 bg-white px-4 py-3">
      <View className="flex-row items-center gap-4">
        <View className="flex-row flex-1 items-center gap-4">
          <EvaluationRowIcon item={item} />

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
        ) : statusIcon ? (
          <TouchableOpacity
            onPress={handleOpenSheet}
            hitSlop={10}
            className="items-center justify-center px-1"
          >
            {statusIcon}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
