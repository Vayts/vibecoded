import type { ProfileProductScore } from '@acme/shared';
import { CircleAlert, HeartCrack, HeartHandshake } from 'lucide-react-native';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { getFitLabelText } from './evaluationHelpers';
import { ScoreReasonsAccordion } from './ScoreReasonsAccordion';

interface ScoreSummaryProps {
  title?: string;
  score: number;
  label: string;
  toneKey: 'excellent' | 'good' | 'average' | 'bad';
  insight?: string | null;
  isInsightPending?: boolean;
  positives?: ProfileProductScore['positives'];
  negatives?: ProfileProductScore['negatives'];
}

interface ScoreSummaryTone {
  backgroundColor: string;
  textColor: string;
}

const SCORE_SUMMARY_TONES: Record<ScoreSummaryProps['toneKey'], ScoreSummaryTone> = {
  excellent: {
    backgroundColor: COLORS.primary100,
    textColor: COLORS.primary900,
  },
  good: {
    backgroundColor: COLORS.primary100,
    textColor: COLORS.primary900,
  },
  average: {
    backgroundColor: COLORS.gray100,
    textColor: COLORS.neutrals900,
  },
  bad: {
    backgroundColor: COLORS.dangerSoft,
    textColor: COLORS.danger800,
  },
};

const getScoreSummaryLabel = (label: string): string => {
  const fitLabel = getFitLabelText(label);
  return fitLabel === 'Neutral fit' ? 'Normal fit' : fitLabel;
};

const getDefaultInsight = (toneKey: ScoreSummaryProps['toneKey']): string => {
  if (toneKey === 'bad') {
    return 'This product is a poor fit because a few key nutrition signals clash with your preferences.';
  }

  if (toneKey === 'average') {
    return 'This product is a decent fit because it has some strengths, but there are still a couple of trade-offs.';
  }

  return 'This product is a good fit because its overall nutrition profile lines up well with your preferences.';
};

export function ScoreSummary({
  score,
  label,
  toneKey,
  insight,
  isInsightPending = false,
  positives = [],
  negatives = [],
}: ScoreSummaryProps) {
  const tone = SCORE_SUMMARY_TONES[toneKey];
  const fitLabel = getScoreSummaryLabel(label);
  const resolvedInsight = isInsightPending
    ? 'Preparing a short fit summary for this product.'
    : insight?.trim() || getDefaultInsight(toneKey);

  const Icon = toneKey === 'bad' ? HeartCrack : toneKey === 'average' ? CircleAlert : HeartHandshake;

  return (
    <View
      className="mt-4 overflow-hidden rounded-[16px] bg-white"
      style={{ borderWidth: 1, borderColor: COLORS.gray200 }}
    >
      <View
        className="flex-row items-center justify-between rounded-[16px] mx-4 mt-4 px-4 py-2"
        style={{ backgroundColor: tone.backgroundColor }}
      >
        <View className="flex-row items-center gap-3">
          <Icon size={18} color={tone.textColor} strokeWidth={2.2} />
          <Typography className="text-[19px] font-semibold" style={{ color: tone.textColor }}>
            {fitLabel}
          </Typography>
        </View>

        <Typography className="text-[22px] font-semibold" style={{ color: tone.textColor }}>
          {score}
          <Typography className="text-[14px]" style={{ color: tone.textColor }}>/100</Typography>
        </Typography>
      </View>

      <View className="px-5 pb-5 pt-4">
        <Typography
          variant="body"
          style={{
            color: COLORS.neutrals900,
            lineHeight: 22,
          }}
        >
          {resolvedInsight}
        </Typography>
        <ScoreReasonsAccordion positives={positives} negatives={negatives} />
      </View>
    </View>
  );
}
