import type { ProductAnalysisResult } from '@acme/shared';
import { View } from 'react-native';

import { NutriScoreBlock } from './NutriScoreBlock';
import { ProductResultHeader } from './ProductResultHeader';
import type { ProductHeaderData } from './useProductResultHeaderChips';

interface ProductResultHeroProps {
  nutriScoreGrade: string | null | undefined;
  product: ProductHeaderData;
  analysisResult?: ProductAnalysisResult;
  hasPreviewAllergenConflict?: boolean;
}

export function ProductResultHero({
  nutriScoreGrade,
  product,
  analysisResult,
  hasPreviewAllergenConflict,
}: ProductResultHeroProps) {
  return (
    <View className="px-4 pb-4">
      <ProductResultHeader
        product={product}
        analysisResult={analysisResult}
        hasPreviewAllergenConflict={hasPreviewAllergenConflict}
      />
      <NutriScoreBlock grade={nutriScoreGrade} />
    </View>
  );
}
