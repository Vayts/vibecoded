import type { ScanHistoryItem } from '@acme/shared';
import { View } from 'react-native';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { ProfileScoreChips } from '../../../scans/components/ProfileScoreChips';
import type { ProfileScoreChipContext } from '../../../scans/hooks/useProfileScoreChipContext';
import { PersonalAnalysisLoader } from './PersonalAnalysisLoader';

export const PREVIEW_SUMMARY_ESTIMATED_HEIGHT = 190;

interface PreviewSummaryContentProps {
  chips?: NonNullable<ScanHistoryItem['profileChips']>;
  score: number | null;
  showPendingSummary: boolean;
  context: ProfileScoreChipContext;
  isLoading?: boolean;
  showActions?: boolean;
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
  isLoading = false,
  showActions = true,
  onExpandDetails,
}: PreviewSummaryContentProps) {
  const hasTopContent = Boolean(chips?.length || score != null || showPendingSummary || isLoading);
  const shouldShowLoader = isLoading || showPendingSummary;
  const loaderTitle = isLoading ? 'Loading product info...' : 'Analyzing product...';
  const loaderDescription = isLoading
    ? 'We\'re preparing the latest product details.'
    : 'We\'re scoring this product for your profile.';

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


      {showActions ? (
        <View className="w-full gap-3" style={{ marginTop: hasTopContent ? 16 : 0 }}>
          <Button fullWidth label="Compare with another" variant="secondary" />
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