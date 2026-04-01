import type { ProductComparisonResult, ProfileComparisonResult } from '@acme/shared';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import ActionSheet, { SheetManager, useSheetPayload } from 'react-native-actions-sheet';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useCompareStore } from '../../stores/compareStore';
import { ComparisonConclusion } from './ComparisonConclusion';
import { ProductComparisonBlock } from './ProductComparisonBlock';
import { ProfileChips } from './ProfileChips';

export function ComparisonResultSheet() {
  const payload = useSheetPayload(SheetsEnum.ComparisonResultSheet);
  const resetCompare = useCompareStore((s) => s.reset);
  const result: ProductComparisonResult | undefined = payload?.result;
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  if (!result) return null;

  const profiles = result.profiles;
  const activeProfileId =
    profiles.find((p) => p.profileId === selectedProfileId)?.profileId ??
    profiles[0]?.profileId ??
    '';
  const activeProfile: ProfileComparisonResult | undefined = profiles.find(
    (p) => p.profileId === activeProfileId,
  );

  const handleClose = () => {
    resetCompare();
    void SheetManager.hide(SheetsEnum.ComparisonResultSheet);
  };

  return (
    <ActionSheet gestureEnabled containerStyle={{ maxHeight: '90%' }}>
      <ScrollView className="px-6 pb-6 pt-2" showsVerticalScrollIndicator={false}>
        <Typography variant="pageTitle" className="mb-4 text-center">
          Comparison
        </Typography>

        {/* Profile Chips */}
        <ProfileChips
          profiles={profiles}
          selectedProfileId={activeProfileId}
          onSelect={setSelectedProfileId}
        />

        {activeProfile ? (
          <View className="gap-3">
            <ProductComparisonBlock
              product={result.product1}
              comparison={activeProfile.product1}
              label="Product 1"
              isWinner={activeProfile.winner === 'product1'}
            />

            <View className="items-center py-1">
              <Typography variant="bodySecondary" className="font-semibold text-gray-300">
                vs
              </Typography>
            </View>

            <ProductComparisonBlock
              product={result.product2}
              comparison={activeProfile.product2}
              label="Product 2"
              isWinner={activeProfile.winner === 'product2'}
            />

            <ComparisonConclusion
              conclusion={activeProfile.conclusion}
              winner={activeProfile.winner}
            />
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
      </ScrollView>
    </ActionSheet>
  );
}
