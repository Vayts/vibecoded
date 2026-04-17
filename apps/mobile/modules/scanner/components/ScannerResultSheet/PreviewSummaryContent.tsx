import {
  GOOD_FIT_SCORE_MIN,
  NEUTRAL_FIT_SCORE_MIN,
  type ScanHistoryItem,
} from '@acme/shared';
import { CircleAlert, HeartCrack, HeartHandshake } from 'lucide-react-native';
import { View } from 'react-native';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { PersonalAnalysisLoader } from './PersonalAnalysisLoader';

export const PREVIEW_SUMMARY_ESTIMATED_HEIGHT = 220;

type PreviewFitTone = 'good' | 'neutral' | 'bad';
type PreviewProfileChip = NonNullable<ScanHistoryItem['profileChips']>[number];

const PREVIEW_FIT_BADGE_TONES = {
  good: {
    backgroundColor: COLORS.successSoft,
    textColor: COLORS.primary900,
  },
  neutral: {
    backgroundColor: COLORS.neutrals100,
    textColor: COLORS.neutrals700,
  },
  bad: {
    backgroundColor: COLORS.dangerSoft,
    textColor: COLORS.danger800,
  },
} as const;

const getPrimaryUserChip = (
  chips?: NonNullable<ScanHistoryItem['profileChips']>,
): PreviewProfileChip | undefined => {
  if (!chips?.length) {
    return undefined;
  }

  return chips.find((chip) => chip.profileId === 'you') ?? chips[0];
};

const getPreviewFitTone = (
  score?: number | null,
  fitLabel?: PreviewProfileChip['fitLabel'],
): PreviewFitTone | null => {
  if (fitLabel === 'great_fit' || fitLabel === 'good_fit') {
    return 'good';
  }

  if (fitLabel === 'poor_fit') {
    return 'bad';
  }

  if (fitLabel === 'neutral') {
    return 'neutral';
  }

  if (score == null) {
    return null;
  }

  if (score >= GOOD_FIT_SCORE_MIN) {
    return 'good';
  }

  if (score >= NEUTRAL_FIT_SCORE_MIN) {
    return 'neutral';
  }

  return 'bad';
};

const getPreviewFitBadgeLabel = (tone: PreviewFitTone): string => {
  if (tone === 'good') {
    return 'Good fit for you';
  }

  if (tone === 'bad') {
    return 'Poor fit for you';
  }

  return 'Neutral fit for you';
};

interface PreviewSummaryContentProps {
  chips?: NonNullable<ScanHistoryItem['profileChips']>;
  score: number | null;
  showPendingSummary: boolean;
  isLoading?: boolean;
  showActions?: boolean;
  onComparePress?: () => void;
  isCompareDisabled?: boolean;
  onExpandDetails: () => void;
}

export function PreviewSummaryContent({
  chips,
  score,
  showPendingSummary,
  isLoading = false,
  showActions = true,
  onComparePress,
  isCompareDisabled = false,
  onExpandDetails,
}: PreviewSummaryContentProps) {
  const hasTopContent = Boolean(chips?.length || score != null || showPendingSummary || isLoading);
  const shouldShowLoader = isLoading || showPendingSummary;
  const loaderTitle = isLoading ? 'Loading product info...' : 'Analyzing product...';
  const loaderDescription = isLoading
    ? 'We\'re preparing the latest product details.'
    : 'We\'re scoring this product for your profile.';
  const primaryUserChip = getPrimaryUserChip(chips);
  const previewFitTone = shouldShowLoader
    ? null
    : getPreviewFitTone(primaryUserChip?.score ?? score, primaryUserChip?.fitLabel);
  const previewFitBadgeTone = previewFitTone ? PREVIEW_FIT_BADGE_TONES[previewFitTone] : null;
  const previewFitBadgeLabel = previewFitTone ? getPreviewFitBadgeLabel(previewFitTone) : null;
  const PreviewFitIcon =
    previewFitTone === 'bad'
      ? HeartCrack
      : previewFitTone === 'neutral'
        ? CircleAlert
        : HeartHandshake;
        
  return (
    <View className="min-h-[32px] items-start justify-center" style={{ paddingTop: 16 }}>
      {shouldShowLoader ? (
        <View className="w-full">
          <PersonalAnalysisLoader
            title={loaderTitle}
            description={loaderDescription}
            withTopMargin={false}
          />
        </View>
      ) : null}

      {previewFitBadgeTone ? (
        <View className="w-full items-center">
          <View
            className="flex-row items-center gap-2 rounded-full px-5 py-3"
            style={{ backgroundColor: previewFitBadgeTone.backgroundColor }}
          >
            <PreviewFitIcon
              size={18}
              color={previewFitBadgeTone.textColor}
              strokeWidth={2.1}
            />
            <Typography
              variant="body"
              className="font-semibold"
              style={{ color: previewFitBadgeTone.textColor }}
            >
              {previewFitBadgeLabel}
            </Typography>
          </View>
        </View>
      ) : null}


      {showActions ? (
        <View className="w-full gap-3" style={{ marginTop: hasTopContent ? 16 : 0 }}>
          <Button
            fullWidth
            label="Compare with another"
            variant="secondary"
            disabled={isCompareDisabled}
            onPress={onComparePress}
          />
          <Button
            fullWidth
            label="↑ Swipe up for details"
            variant="ghost"
            onPress={onExpandDetails}
          />
        </View>
      ) : null}
    </View>
  );
}