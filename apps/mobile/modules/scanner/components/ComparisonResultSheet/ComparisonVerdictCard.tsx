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

const getShortProfileName = (displayName: string): string => {
  const normalizedName = displayName.trim();

  if (!normalizedName) {
    return '';
  }

  if (normalizedName.toLowerCase() === 'you') {
    return '';
  }

  return normalizedName.split(/\s+/)[0] ?? normalizedName;
};

const toPossessiveName = (name: string): string => {
  if (!name) {
    return 'their';
  }

  return name.endsWith('s') ? `${name}'` : `${name}'s`;
};

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
  const shortProfileName = getShortProfileName(profileResult.displayName);
  const verdictTitle =
    profileResult.type === 'user'
      ? shortProfileName
        ? `Better fit for you, ${shortProfileName}`
        : 'Better fit for you'
      : shortProfileName
        ? `Better fit for ${shortProfileName}`
        : 'Better fit for this profile';
  const verdictSubtitle =
    profileResult.type === 'user'
      ? `${getComparedProductDisplayName(winner)} is the best choice based on your profile and goals`
      : `${getComparedProductDisplayName(winner)} is the best choice based on ${toPossessiveName(shortProfileName)} profile and goals`;

  return (
    <View
      className="mt-4 overflow-hidden rounded-[16px] border bg-white py-4"
      style={{ borderColor: COLORS.gray200 }}
    >
      <View className="px-4">
        <Typography className="text-[10px] font-bold uppercase text-primary-700">
          Verdict
        </Typography>

        <Typography variant="sectionTitle" className="mt-2 text-[18px] font-bold text-neutrals-900">
          {verdictTitle}
        </Typography>
        <Typography className="mt-1 text-[14px] text-neutrals-600">{verdictSubtitle}</Typography>
      </View>

      <View className="mt-4 px-4 flex-row gap-4 border-t border-b py-3 border-neutral-200">
        <VerdictSubscoreItem label="Safety" score={safetyScore} />
        <VerdictSubscoreItem label="Goal fit" score={goalFitScore} />
        <VerdictSubscoreItem label="Nutrition" score={nutritionScore} />
      </View>

      <View className="px-4">
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
    </View>
  );
}
