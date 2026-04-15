import type { ProductComparisonResult, ProfileComparisonResult } from '@acme/shared';
import type { ReactNode } from 'react';
import { ArrowLeftRight, CircleX } from 'lucide-react-native';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { ScreenSheet } from '../../../../shared/components/ScreenSheet';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { ComparisonProductCard } from './ComparisonProductCard';
import { ComparisonProfileSelector } from './ComparisonProfileSelector';
import { NutritionComparison } from './MetricRow';
import { VerdictCard } from './VerdictCard';

type DisplayWinner = 'left' | 'right' | 'tie' | 'neither';
type ComparisonMetric = ProfileComparisonResult['product1'];
type ComparisonProduct = ProductComparisonResult['product1'];

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
  displayWinner: DisplayWinner;
  insetsBottom: number;
  leftComparison: ComparisonMetric | null;
  leftProduct: ComparisonProduct;
  onSelectProfile: (profileId: string) => void;
  onSwapProducts: () => void;
  result: ProductComparisonResult;
  rightComparison: ComparisonMetric | null;
  rightProduct: ComparisonProduct;
  selectedProfileId: string;
}

export function ComparisonResultContent({
  activeProfile,
  bottomAction,
  chipItems,
  displayWinner,
  insetsBottom,
  leftComparison,
  leftProduct,
  onSelectProfile,
  onSwapProducts,
  result,
  rightComparison,
  rightProduct,
  selectedProfileId,
}: ComparisonResultContentProps) {
  const showNoMatchesBadge = displayWinner === 'neither';

  return (
    <View className="flex-1 bg-background">
      <ScreenSheet>
          <ScrollView
            contentContainerStyle={{ paddingBottom: insetsBottom + 28, paddingTop: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <ComparisonProfileSelector
              profiles={chipItems}
              selectedProfileId={selectedProfileId}
              onSelect={onSelectProfile}
            />
            <View className="px-4">
              {activeProfile && leftComparison && rightComparison ? (
                <View className={chipItems.length > 1 ? 'mt-7' : 'mt-0'}>
                  {showNoMatchesBadge ? (
                    <View className="absolute -top-4 left-0 right-0 z-20 items-center">
                      <View
                        className="flex-row items-center rounded-full border-[3px] border-white px-4 py-2"
                        style={{ backgroundColor: COLORS.danger800 }}
                      >
                        <CircleX color={COLORS.white} size={18} strokeWidth={2.25} />
                        <Typography variant="buttonSmall" className="ml-2 text-white">
                          No matches
                        </Typography>
                      </View>
                    </View>
                  ) : null}
                  <View className="relative mb-4 flex-row gap-3 pt-1">
                    <ComparisonProductCard
                      product={leftProduct}
                      tone={
                        displayWinner === 'left'
                          ? 'winner'
                          : displayWinner === 'neither'
                            ? 'not-suitable'
                            : 'neutral'
                      }
                      badgeLabel={displayWinner === 'left' ? 'Best choice' : undefined}
                    />
                    <ComparisonProductCard
                      product={rightProduct}
                      tone={
                        displayWinner === 'right'
                          ? 'winner'
                          : displayWinner === 'neither'
                            ? 'not-suitable'
                            : 'neutral'
                      }
                      badgeLabel={displayWinner === 'right' ? 'Best choice' : undefined}
                    />
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Swap compared products"
                      activeOpacity={0.8}
                      className="absolute left-1/2 h-10 w-10 items-center justify-center rounded-full border bg-white"
                      style={{
                        borderColor: COLORS.gray200,
                        marginLeft: -20,
                        marginTop: -20,
                        top: '50%',
                      }}
                      onPress={onSwapProducts}
                    >
                      <ArrowLeftRight color={COLORS.gray700} size={18} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                  <NutritionComparison
                    leftProduct={leftProduct}
                    rightProduct={rightProduct}
                    leftComparison={leftComparison}
                    rightComparison={rightComparison}
                    displayWinner={displayWinner}
                  />
                  <VerdictCard profile={activeProfile} product1={result.product1} product2={result.product2} />
                  {bottomAction}
                </View>
              ) : (
                <View className="items-center py-8">
                  <Typography variant="bodySecondary" className="text-gray-400">
                    No comparison data available
                  </Typography>
                </View>
              )}
            </View>
          </ScrollView>
      </ScreenSheet>
    </View>
  );
}