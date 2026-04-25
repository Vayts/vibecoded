import type { ProfileProductScore, ScoreReason } from '@acme/shared';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Info } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface ScoreReasonsAccordionProps {
  positives?: ProfileProductScore['positives'];
  negatives?: ProfileProductScore['negatives'];
}

interface ScoreReasonTone {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

const SCORE_REASON_TONES = {
  positive: {
    backgroundColor: COLORS.successSoft,
    borderColor: COLORS.successBorder,
    textColor: COLORS.success,
  },
  warning: {
    backgroundColor: COLORS.warningSoft,
    borderColor: COLORS.warningBorder,
    textColor: COLORS.warning,
  },
  danger: {
    backgroundColor: COLORS.danger50,
    borderColor: COLORS.dangerBorder,
    textColor: COLORS.danger,
  },
} satisfies Record<'positive' | 'warning' | 'danger', ScoreReasonTone>;

const getScoreReasonText = (reason: ScoreReason): string => reason.description.trim() || reason.label;

const getScoreReasonTone = (reason: ScoreReason): ScoreReasonTone => {
  if (reason.impact > 0) {
    return SCORE_REASON_TONES.positive;
  }

  return Math.abs(reason.impact) >= 10 ? SCORE_REASON_TONES.danger : SCORE_REASON_TONES.warning;
};

export function ScoreReasonsAccordion({
  positives = [],
  negatives = [],
}: ScoreReasonsAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const scoreReasons = useMemo(() => {
    const negativeReasons = negatives
      .filter((reason) => reason.impact < 0)
      .sort((left, right) => Math.abs(right.impact) - Math.abs(left.impact));
    const positiveReasons = positives
      .filter((reason) => reason.impact > 0)
      .sort((left, right) => right.impact - left.impact);

    return [...negativeReasons, ...positiveReasons];
  }, [negatives, positives]);

  if (scoreReasons.length === 0) {
    return null;
  }

  return (
    <View className="mt-4 border-t border-gray-200 pt-4">
      <TouchableOpacity
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${isExpanded ? 'Hide' : 'Show'} why this score details`}
        className="flex-row items-center justify-between"
        onPress={() => {
          setIsExpanded((currentValue) => !currentValue);
        }}
      >
        <View className="flex-1 flex-row items-center">
          <Info color={COLORS.neutrals500} size={18} strokeWidth={2.2} />
          <Typography className="ml-3 text-[18px] font-semibold text-neutrals-900">
            Why this score?
          </Typography>
        </View>

        {isExpanded ? (
          <ChevronUp color={COLORS.neutrals500} size={20} strokeWidth={2.2} />
        ) : (
          <ChevronDown color={COLORS.neutrals500} size={20} strokeWidth={2.2} />
        )}
      </TouchableOpacity>

      {isExpanded ? (
        <View className="mt-4">
          {scoreReasons.map((reason, index) => {
            const reasonTone = getScoreReasonTone(reason);
            const ReasonIcon = reason.impact > 0 ? ArrowUp : ArrowDown;

            return (
              <View
                key={`${reason.key}-${index}`}
                className={`flex-row items-start rounded-[14px] border px-4 py-3 ${index > 0 ? 'mt-3' : ''}`}
                style={{
                  backgroundColor: reasonTone.backgroundColor,
                  borderColor: reasonTone.borderColor,
                }}
              >
                <ReasonIcon color={reasonTone.textColor} size={18} strokeWidth={2.2} />
                <Typography
                  variant="body"
                  className="ml-3 flex-1 font-semibold"
                  style={{ color: reasonTone.textColor }}
                >
                  {getScoreReasonText(reason)}
                </Typography>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

