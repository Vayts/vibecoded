import type { ScoreReason, ScannerOverallRating } from '@acme/shared';
import { CircleAlert, HeartCrack, HeartHandshake } from 'lucide-react-native';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import {
  formatOverallRatingColors,
  formatOverallRatingLabel,
  formatScoreColors,
  mapOverallRatingToToneKey,
} from './evaluationHelpers';
import { ScoreReasonsAccordion } from './ScoreReasonsAccordion';
import { useMemo } from 'react';

interface ScoreSummaryProps {
  score: number;
  rating: ScannerOverallRating;
  summary: string;
  safetyScore: number;
  goalFitScore: number;
  nutritionScore: number;
  positives?: ScoreReason[];
  negatives?: ScoreReason[];
}

interface SubscoreItemProps {
  label: string;
  score: number;
}

function SubscoreItem({ label, score }: SubscoreItemProps) {
  const progress = Math.max(5, Math.min(score, 100));
  const color = formatScoreColors(score);

  return (
    <View className="flex-1 items-center">
      <Typography className="text-[12px] text-neutrals-900">
        {label}
      </Typography>

      <View className="mt-1 h-1 w-full rounded-full bg-gray-200">
        <View
          className="h-1 rounded-full"
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
      </View>

      <Typography className="mt-1.5 text-[12px] font-semibold text-neutrals-900">{score}</Typography>
    </View>
  );
}

export function ScoreSummary({
  score,
  rating,
  summary,
  safetyScore,
  goalFitScore,
  nutritionScore,
  positives = [],
  negatives = [],
}: ScoreSummaryProps) {
  const toneKey = mapOverallRatingToToneKey(rating);
  const tone = useMemo(() => formatOverallRatingColors(score), [score]);
  const ratingLabel = formatOverallRatingLabel(score);

  const Icon = toneKey === 'bad' ? HeartCrack : toneKey === 'average' ? CircleAlert : HeartHandshake;

  return (
    <View
      className="mt-4 overflow-hidden rounded-[16px] bg-white"
      style={{ borderWidth: 1, borderColor: COLORS.gray200 }}
    >
      <View className="px-4 pt-4">
        <Typography className="text-[10px] font-bold uppercase text-neutral-500">Fit score</Typography>
      </View>

      <View
        className="flex-row items-center justify-between rounded-[4px] rounded-tr-[16px] rounded-tl-[16px] mx-4 mt-4 px-4 py-2 border"
        style={{ backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }}
      >
        <View className="flex-row items-center gap-3">
          <Icon size={18} color={tone.textColor} strokeWidth={2.2} />
          <Typography className="text-[19px] font-semibold" style={{ color: tone.textColor }}>
            {ratingLabel}
          </Typography>
        </View>

        <Typography className="text-[22px] font-bold" style={{ color: tone.textColor }}>
          {score}
          <Typography className="text-[14px] font-semibold" style={{ color: tone.textColor }}>
            /100
          </Typography>
        </Typography>
      </View>

      <View className="px-5 pb-5 pt-4">
        <View className="flex-row gap-4">
          <SubscoreItem label="Safety" score={safetyScore} />
          <SubscoreItem label="Goal fit" score={goalFitScore} />
          <SubscoreItem label="Nutrition" score={nutritionScore} />
        </View>
        <Typography
          variant="body"
          className="mt-4"
          style={{
            color: COLORS.neutrals900,
            lineHeight: 22,
          }}
        >
          {summary}
        </Typography>
        <ScoreReasonsAccordion positives={positives} negatives={negatives} />
      </View>
    </View>
  );
}
