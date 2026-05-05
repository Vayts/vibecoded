import type { ScoreReason, ScannerOverallRating } from '@acme/shared';
import { CircleAlert, HeartCrack, HeartHandshake } from 'lucide-react-native';
import { View } from 'react-native';
import { useMemo } from 'react';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { RESTRICTION_ICON } from '../../constants/restriction-icon';
import {
  formatOverallRatingColors,
  formatOverallRatingLabel,
  formatScoreColors,
  mapOverallRatingToToneKey,
} from './evaluationHelpers';
import { ScoreReasonsAccordion } from './ScoreReasonsAccordion';

interface ScoreSummaryProps {
  score: number;
  rating: ScannerOverallRating;
  summary: string;
  safetyScore: number;
  matchedAllergens: string[];
  violatedRestrictions: string[];
  goalFitScore: number;
  nutritionScore: number;
  positives?: ScoreReason[];
  negatives?: ScoreReason[];
}

const HARD_RESTRICTION_SCORE_THRESHOLD = 30;

const resolveRestrictionIcon = (violatedRestrictions: string[], matchedAllergens: string[]) => {
  if (violatedRestrictions.length > 0) {
    const restrictionKey = violatedRestrictions[0]?.trim() as keyof typeof RESTRICTION_ICON;
    return RESTRICTION_ICON[restrictionKey] ?? RESTRICTION_ICON.default;
  }

  if (matchedAllergens.length > 0) {
    return RESTRICTION_ICON.default;
  }

  return RESTRICTION_ICON.default;
};

interface SubscoreItemProps {
  label: string;
  score: number;
}

function SubscoreItem({ label, score }: SubscoreItemProps) {
  const progress = Math.max(5, Math.min(score, 100));
  const color = formatScoreColors(score);

  return (
    <View className="flex-1 items-center">
      <Typography className="text-[12px] text-neutrals-900">{label}</Typography>

      <View className="mt-1 h-1 w-full rounded-full bg-gray-200">
        <View
          className="h-1 rounded-full"
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
      </View>

      <Typography className="mt-1.5 text-[12px] font-semibold text-neutrals-900">
        {score}
      </Typography>
    </View>
  );
}

export function ScoreSummary({
  score,
  rating,
  summary,
  safetyScore,
  matchedAllergens,
  violatedRestrictions,
  goalFitScore,
  nutritionScore,
  positives = [],
  negatives = [],
}: ScoreSummaryProps) {
  const toneKey = mapOverallRatingToToneKey(rating);
  const tone = useMemo(() => formatOverallRatingColors(score), [score]);
  const ratingLabel = formatOverallRatingLabel(score);
  const isHardRestrictionState = safetyScore < HARD_RESTRICTION_SCORE_THRESHOLD;

  const Icon =
    toneKey === 'bad' ? HeartCrack : toneKey === 'average' ? CircleAlert : HeartHandshake;
  const RestrictionIcon = resolveRestrictionIcon(violatedRestrictions, matchedAllergens);

  return (
    <View
      className="mt-4 overflow-hidden rounded-[16px] bg-white"
      style={{ borderWidth: 1, borderColor: COLORS.gray200 }}
    >
      <View className="px-4 pt-4">
        <Typography className="text-[10px] font-bold uppercase text-neutral-500">
          Fit score
        </Typography>
      </View>

      <View
        className="flex-row items-center justify-between rounded-[4px] rounded-tr-[16px] rounded-tl-[16px] mx-4 mt-4 px-4 py-2 border"
        style={{
          backgroundColor: isHardRestrictionState ? COLORS.dangerSoft : tone.backgroundColor,
          borderColor: isHardRestrictionState ? COLORS.dangerBorder : tone.borderColor,
        }}
      >
        <View className="flex-row items-center gap-3 flex-shrink">
          {isHardRestrictionState ? null : (
            <Icon size={18} color={tone.textColor} strokeWidth={2.2} />
          )}
          <Typography
            className="flex-1 text-[19px] font-semibold flex-shrink"
            style={
              isHardRestrictionState
                ? {
                    color: isHardRestrictionState ? COLORS.danger800 : tone.textColor,
                    fontSize: 12,
                  }
                : { color: tone.textColor }
            }
          >
            {isHardRestrictionState ? 'Score unavailable due to hard restriction' : ratingLabel}
          </Typography>
        </View>

        {isHardRestrictionState ? (
          <RestrictionIcon color={COLORS.danger800} size={22} strokeWidth={2.2} />
        ) : (
          <Typography className="text-[22px] font-bold" style={{ color: tone.textColor }}>
            {score}
            <Typography className="text-[14px] font-semibold" style={{ color: tone.textColor }}>
              /100
            </Typography>
          </Typography>
        )}
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
