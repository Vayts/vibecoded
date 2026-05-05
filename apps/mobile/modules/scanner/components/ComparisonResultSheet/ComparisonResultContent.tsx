import type { ReactNode } from 'react';
import { ArrowLeftRight, CircleX } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { ScreenSheet } from '../../../../shared/components/ScreenSheet';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { ComparisonExplanationSection } from './ComparisonExplanationSection';
import { ComparisonNutritionTable } from './ComparisonNutritionTable';
import { ComparisonProductCard } from './ComparisonProductCard';
import { ComparisonProfileSelector } from './ComparisonProfileSelector';
import { getProductDisplayName } from './comparisonResultHelpers';
import { getDisplayNutritionRows } from './comparisonNutritionRows';
import type { ComparedProduct, ProfileCompareResult } from '../../utils/profileCompareTypes';

interface ComparisonChipItem {
  fallbackImageUrl: string | null;
  id: string;
  imageUrl: string | null;
  name: string;
}

interface ComparisonResultContentProps {
  activeProfile?: ProfileCompareResult;
  bottomAction?: ReactNode;
  chipItems: ComparisonChipItem[];
  insetsBottom: number;
  onSelectProfile: (profileId: string) => void;
  selectedProfileId: string;
}

const isSameComparedProduct = (left: ComparedProduct, right: ComparedProduct | null) => {
  if (!right) return false;
  const leftKey = left.productId || left.barcode;
  const rightKey = right.productId || right.barcode;
  return leftKey === rightKey;
};

const getBadgeLabel = (product: ComparedProduct, profile: ProfileCompareResult) => {
  if (profile.status === 'no_suitable_product') return undefined;
  if (profile.status === 'equivalent') return 'Similar fit';
  return isSameComparedProduct(product, profile.winner) ? 'Best choice' : undefined;
};

const getProductTone = (product: ComparedProduct, profile: ProfileCompareResult) => {
  if (profile.status === 'no_suitable_product') return 'not-suitable' as const;
  if (profile.status === 'winner_found' && isSameComparedProduct(product, profile.winner)) {
    return 'winner' as const;
  }
  return 'neutral' as const;
};

export function ComparisonResultContent({
  activeProfile,
  bottomAction,
  chipItems,
  insetsBottom,
  onSelectProfile,
  selectedProfileId,
}: ComparisonResultContentProps) {
  const leftComparedProduct = activeProfile?.products[0];
  const rightComparedProduct = activeProfile?.products[1];
  const displayRows =
    leftComparedProduct && rightComparedProduct
      ? getDisplayNutritionRows(leftComparedProduct, rightComparedProduct)
      : [];
  const isNoMatch = activeProfile?.status === 'no_suitable_product';

  return (
    <View className="flex-1 bg-background">
      <ScreenSheet>
        <ScrollView
          contentContainerStyle={{ paddingTop: chipItems?.length > 1 ? 24 : 12 }}
          showsVerticalScrollIndicator={false}
        >
          <ComparisonProfileSelector
            profiles={chipItems}
            selectedProfileId={selectedProfileId}
            onSelect={onSelectProfile}
          />
          <View className="mt-2 px-4 pb-4">
            {activeProfile && leftComparedProduct && rightComparedProduct ? (
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
                          No suitable product
                        </Typography>
                      </View>
                    </View>
                  ) : null}

                  <ComparisonProductCard
                    product={leftComparedProduct.product}
                    score={leftComparedProduct.analysis.overall?.score ?? null}
                    tone={getProductTone(leftComparedProduct, activeProfile)}
                    badgeLabel={getBadgeLabel(leftComparedProduct, activeProfile)}
                  />
                  <ComparisonProductCard
                    product={rightComparedProduct.product}
                    score={rightComparedProduct.analysis.overall?.score ?? null}
                    tone={getProductTone(rightComparedProduct, activeProfile)}
                    badgeLabel={getBadgeLabel(rightComparedProduct, activeProfile)}
                  />

                  <View
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
                  >
                    <ArrowLeftRight color={COLORS.gray700} size={18} strokeWidth={2} />
                  </View>
                </View>
                <ComparisonExplanationSection profileResult={activeProfile} />
                <ComparisonNutritionTable
                  leftProduct={{
                    brand: leftComparedProduct.product.brand,
                    title: getProductDisplayName(leftComparedProduct.product),
                  }}
                  rightProduct={{
                    brand: rightComparedProduct.product.brand,
                    title: getProductDisplayName(rightComparedProduct.product),
                  }}
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
          <View
            className="pt-4 border-t border-neutrals-200 bg-background px-4"
            style={{ paddingBottom: insetsBottom + 48 }}
          >
            <Typography variant="sectionTitle">Options</Typography>
            {bottomAction}
          </View>
        </ScrollView>
      </ScreenSheet>
    </View>
  );
}
