import type { ProductComparisonResult, ProfileComparisonResult } from '@acme/shared';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import ActionSheet, { SheetManager, useSheetPayload, ScrollView } from 'react-native-actions-sheet';
import { Button } from '../../../../shared/components/Button';
import { ProfileChips } from '../../../../shared/components/ProfileChips';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useScanDetailQuery } from '../../../scans/hooks/useScanHistoryQuery';
import { useComparisonDetailQuery } from '../../../scans/hooks/useComparisonsQuery';
import { useCompareStore } from '../../stores/compareStore';
import { ComparisonProductCard } from './ComparisonProductCard';
import { MetricsSummaryRow, NutritionComparison } from './MetricRow';
import { VerdictCard } from './VerdictCard';

export function ComparisonResultSheet() {
  const payload = useSheetPayload(SheetsEnum.ComparisonResultSheet);
  const resetCompare = useCompareStore((s) => s.reset);

  const scanId = payload?.scanId;
  const comparisonId = payload?.comparisonId;
  const { data: scanDetail, isLoading: isScanLoading } = useScanDetailQuery(scanId);
  const { data: comparisonDetail, isLoading: isComparisonLoading } =
    useComparisonDetailQuery(comparisonId);

  const isLoading = (scanId && isScanLoading) || (comparisonId && isComparisonLoading);

  const result: ProductComparisonResult | undefined =
    payload?.result ??
    (comparisonDetail?.comparisonResult as ProductComparisonResult | undefined) ??
    (scanDetail?.comparisonResult as ProductComparisonResult | undefined);

  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  const profiles = result?.profiles;
  const chipItems = useMemo(
    () => profiles?.map((p) => ({ id: p.profileId, name: p.profileName })) ?? [],
    [profiles],
  );

  const handleClose = () => {
    resetCompare();
    void SheetManager.hide(SheetsEnum.ComparisonResultSheet);
  };

  if ((scanId || comparisonId) && isLoading) {
    return (
      <ActionSheet gestureEnabled containerStyle={{ maxHeight: '90%' }}>
        <View className="items-center justify-center px-6 py-12">
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Typography variant="bodySecondary" className="mt-3 text-gray-500">
            Loading comparison…
          </Typography>
        </View>
      </ActionSheet>
    );
  }

  if (!result || !profiles) return null;

  const activeProfileId =
    profiles.find((p) => p.profileId === selectedProfileId)?.profileId ??
    profiles[0]?.profileId ??
    '';
  const activeProfile: ProfileComparisonResult | undefined = profiles.find(
    (p) => p.profileId === activeProfileId,
  );

  const hasNutrition =
    result.product1.nutrition !== undefined && result.product2.nutrition !== undefined;

  return (
    <ActionSheet useBottomSafeAreaPadding={false} gestureEnabled containerStyle={{ maxHeight: '90%' }}>
      <ScrollView className="pt-2" contentContainerClassName='pb-20' showsVerticalScrollIndicator={false}>
        <Typography variant="pageTitle" className="mb-4 text-center">
          Comparison
        </Typography>

        <ProfileChips
          profiles={chipItems}
          selectedProfileId={activeProfileId}
          onSelect={setSelectedProfileId}
          className="mb-4"
        />

        <View className="px-4">
          {activeProfile ? (
          <View className="gap-4">
            <View className="flex-row gap-3">
              <ComparisonProductCard
                product={result.product1}
                label="Product A"
                isWinner={activeProfile.winner === 'product1'}
                isNeither={activeProfile.winner === 'neither'}
              />
              <ComparisonProductCard
                product={result.product2}
                label="Product B"
                isWinner={activeProfile.winner === 'product2'}
                isNeither={activeProfile.winner === 'neither'}
              />
            </View>

            {/* Verdict card */}
            <VerdictCard
              profile={activeProfile}
              product1={result.product1}
              product2={result.product2}
            />

            {/* Detailed nutrition bars */}
            {hasNutrition ? (
              <NutritionComparison
                nutritionA={result.product1.nutrition}
                nutritionB={result.product2.nutrition}
              />
            ) : null}
          </View>
        ) : (
          <View className="items-center py-8">
            <Typography variant="bodySecondary" className="text-gray-400">
              No comparison data available
            </Typography>
          </View>
        )}

        <View className="mt-4">
          <Button fullWidth label="Done" onPress={handleClose} />
        </View>
        </View>
      </ScrollView>
    </ActionSheet>
  );
}
