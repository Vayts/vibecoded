import React from 'react';
import { View } from 'react-native';
import { ComparisonSummaryChip } from './ComparisonSummaryChip';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { formatScoreColors } from '../ScannerResultSheet/evaluationHelpers';
import {
  dedupeChips,
  factsToChips,
  getComparedProductDisplayName,
} from './comparisonResultHelpers';
import type { ProfileCompareResult } from '../../utils/profileCompareTypes';

interface ComparisonVerdictCardProps {
  profileResult: ProfileCompareResult;
}

interface VerdictSubscoreItemProps {
  label: string;
  score: number;
}

function VerdictSubscoreItem({ label, score }: VerdictSubscoreItemProps) {
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

export function ComparisonVerdictCard({ profileResult }: ComparisonVerdictCardProps) {
  const winner = profileResult.winner;

  if (!winner) {
    return null;
  }

  const winnerChips = dedupeChips(factsToChips(profileResult.winnerBestAt));
  const summary = winner.analysis.overall?.summary?.trim();
  const safetyScore = winner.analysis.safety?.score ?? 0;
  const goalFitScore = winner.analysis.goalFit?.score ?? 0;
  const nutritionScore = winner.analysis.nutrition?.score ?? 0;

  return (
    <View
      className="mt-4 overflow-hidden rounded-[16px] border bg-white px-4 py-4"
      style={{ borderColor: COLORS.gray200 }}
    >
      <Typography className="text-[10px] font-bold uppercase text-neutral-500">Verdict</Typography>

      <Typography variant="sectionTitle" className="mt-2 text-[18px] font-bold text-neutrals-900">
        {getComparedProductDisplayName(winner)} is the best fit
      </Typography>

      <View className="mt-4 flex-row gap-4">
        <VerdictSubscoreItem label="Safety" score={safetyScore} />
        <VerdictSubscoreItem label="Goal fit" score={goalFitScore} />
        <VerdictSubscoreItem label="Nutrition" score={nutritionScore} />
      </View>

      {summary ? (
        <Typography variant="body" className="mt-4 leading-6 text-neutrals-700">
          {summary}
        </Typography>
      ) : null}

      {winnerChips.length > 0 ? (
        <View className="mt-4 flex-row flex-wrap gap-2">
          {winnerChips.map((chip, index) => (
            <ComparisonSummaryChip
              key={`${chip.text}-${index}`}
              iconKey={chip.iconKey}
              text={chip.text}
              variant="primary"
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
