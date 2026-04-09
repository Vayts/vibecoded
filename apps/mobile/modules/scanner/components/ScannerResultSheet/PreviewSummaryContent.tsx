import type { ScanHistoryItem } from '@acme/shared';
import type { LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { ProfileScoreChips } from '../../../scans/components/ProfileScoreChips';
import type { ProfileScoreChipContext } from '../../../scans/hooks/useProfileScoreChipContext';
import { Button } from '../../../../shared/components/Button';

export const PREVIEW_SUMMARY_ESTIMATED_HEIGHT = 160;

interface PreviewSummaryContentProps {
  chips?: NonNullable<ScanHistoryItem['profileChips']>;
  score: number | null;
  showPendingSummary: boolean;
  context: ProfileScoreChipContext;
  onLayout?: (event: LayoutChangeEvent) => void;
  onExpandDetails: () => void;
}

const getSummaryScoreColor = (score: number): string => {
  if (score >= 70) return COLORS.success;
  if (score >= 40) return COLORS.warning;
  return COLORS.danger;
};

export function PreviewSummaryContent({
  chips,
  score,
  showPendingSummary,
  context,
  onLayout,
  onExpandDetails,
}: PreviewSummaryContentProps) {
  return (
    <View
      className="min-h-[32px] items-start justify-center"
      style={{ paddingTop: 16 }}
      onLayout={onLayout}
    >
      {chips?.length ? (
        null
      ) : score != null ? (
        <View
          className="rounded-full px-3 py-1"
          style={{ backgroundColor: COLORS.neutrals100 }}
        >
          <Typography
            variant="buttonSmall"
            style={{ color: getSummaryScoreColor(score) }}
          >
            {score}
          </Typography>
        </View>
      ) : showPendingSummary ? (
        <Typography variant="bodySecondary" className="text-amber-600">
          Analyzing…
        </Typography>
      ) : null}

      <View style={{width: '100%'}}>
        <Button fullWidth label="Compare with another" variant="secondary"/>
        <Button
          fullWidth
          label="↑ Swipe up for details"
          variant="ghost"
          onPress={onExpandDetails}
        />
      </View>
    </View>
  );
}