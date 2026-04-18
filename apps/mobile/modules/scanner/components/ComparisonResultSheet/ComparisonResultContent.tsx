import type { ProductComparisonResult, ProfileComparisonResult } from '@acme/shared';
import type { ReactNode } from 'react';
import { ArrowLeftRight, CircleX } from 'lucide-react-native';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { ScreenSheet } from '../../../../shared/components/ScreenSheet';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { ComparisonExplanationSection } from './ComparisonExplanationSection';
import { ComparisonNutritionTable } from './ComparisonNutritionTable';
import { ComparisonProductCard } from './ComparisonProductCard';
import { ComparisonProfileSelector } from './ComparisonProfileSelector';
import {
  getBestProductKey,
  getOutcomeState,
  getProductDisplayName,
  getProductStatusLabel,
} from './comparisonResultHelpers';
import {
  getDisplayNutritionRows,
  swapDisplayNutritionRows,
} from './comparisonNutritionRows';

interface ComparisonChipItem {
  fallbackImageUrl: string | null;
  id: string;
  imageUrl: string | null;
  name: string;
}

interface ComparisonResultContentProps {
  activeProfile?: ProfileComparisonResult;
  bottomAction?: ReactNode;
  chipItems: ComparisonChipItem[];
  insetsBottom: number;
  isSwapped: boolean;
  onSelectProfile: (profileId: string) => void;
  onSwapProducts: () => void;
  result: ProductComparisonResult;
  selectedProfileId: string;
}

export function ComparisonResultContent({
  activeProfile,
  bottomAction,
  chipItems,
  insetsBottom,
  isSwapped,
  onSelectProfile,
  onSwapProducts,
  result,
  selectedProfileId,
}: ComparisonResultContentProps) {
  const bestProductKey = activeProfile ? getBestProductKey(activeProfile, result) : null;
  const outcome = activeProfile ? getOutcomeState(activeProfile, result) : 'neutral';
  const nutritionRows = activeProfile ? getDisplayNutritionRows(activeProfile, result) : [];
  const displayRows = isSwapped ? swapDisplayNutritionRows(nutritionRows) : nutritionRows;
  const leftProduct = isSwapped ? result.product2 : result.product1;
  const rightProduct = isSwapped ? result.product1 : result.product2;
  const leftProductKey = isSwapped ? 'product2' : 'product1';
  const rightProductKey = isSwapped ? 'product1' : 'product2';
  const isNoMatch = outcome === 'no-match';

  return (
    <View className="flex-1 bg-background">
      <ScreenSheet>
        <ScrollView
          contentContainerStyle={{ paddingTop: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <ComparisonProfileSelector
            profiles={chipItems}
            selectedProfileId={selectedProfileId}
            onSelect={onSelectProfile}
          />
          <View className="mt-6 px-4 pb-4">
            {activeProfile ? (
              <View>
                <View className="relative flex-row gap-4">
                  {isNoMatch ? (
                    <View className="absolute left-0 right-0 top-0 z-20 items-center">
                      <View
                        className="flex-row items-center rounded-full border-[3px] border-white px-4 py-2"
                        style={{
                          backgroundColor: COLORS.danger800,
                          shadowColor: COLORS.black,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.08,
                          shadowRadius: 8,
                          elevation: 3,
                        }}
                      >
                        <CircleX color={COLORS.white} size={18} strokeWidth={2.25} />
                        <Typography variant="buttonSmall" className="ml-2 text-white">
                          No matches
                        </Typography>
                      </View>
                    </View>
                  ) : null}

                  <ComparisonProductCard
                    product={leftProduct}
                    tone={isNoMatch ? 'not-suitable' : bestProductKey === leftProductKey ? 'winner' : 'neutral'}
                    badgeLabel={isNoMatch ? undefined : getProductStatusLabel(leftProductKey, outcome, bestProductKey)}
                  />
                  <ComparisonProductCard
                    product={rightProduct}
                    tone={isNoMatch ? 'not-suitable' : bestProductKey === rightProductKey ? 'winner' : 'neutral'}
                    badgeLabel={isNoMatch ? undefined : getProductStatusLabel(rightProductKey, outcome, bestProductKey)}
                  />

                  <TouchableOpacity
                    accessibilityLabel="Swap compared products"
                    accessibilityRole="button"
                    activeOpacity={0.8}
                    className="absolute left-1/2 top-1/2 h-10 w-10 items-center justify-center rounded-full border bg-white"
                    style={{
                      borderColor: COLORS.gray200,
                      marginLeft: -20,
                      marginTop: -20,
                      shadowColor: COLORS.black,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.08,
                      shadowRadius: 10,
                      elevation: 3,
                    }}
                    onPress={onSwapProducts}
                  >
                    <ArrowLeftRight color={COLORS.gray700} size={18} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <ComparisonExplanationSection
                  bestProductKey={bestProductKey}
                  outcome={outcome}
                  product1={result.product1}
                  product2={result.product2}
                  profile={activeProfile}
                />
                <ComparisonNutritionTable
                  leftProduct={{ brand: leftProduct.brands, title: getProductDisplayName(leftProduct) }}
                  rightProduct={{ brand: rightProduct.brands, title: getProductDisplayName(rightProduct) }}
                  rows={displayRows}
                />
              </View>
            ) : (
              <View className="items-center py-8">
                <Typography variant="bodySecondary" className="text-gray-400">
                  No comparison data available
                </Typography>
              </View>
            )}
          </View>
          <View className="pt-4 border-t border-neutrals-200 bg-background px-4" style={{ paddingBottom: insetsBottom + 48 }}>
            <Typography variant="sectionTitle">Options</Typography>
            {bottomAction}
          </View>
        </ScrollView>
      </ScreenSheet>
    </View>
  );
}