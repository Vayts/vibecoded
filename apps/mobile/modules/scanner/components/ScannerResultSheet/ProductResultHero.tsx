import type { BarcodeLookupProduct, ProductPreview, ScanHistoryItem } from '@acme/shared';
import { View } from 'react-native';

import { NutriScoreBlock } from './NutriScoreBlock';
import { ProductResultHeader } from './ProductResultHeader';

type ProductHeaderData =
  | BarcodeLookupProduct
  | ProductPreview
  | NonNullable<ScanHistoryItem['product']>;

interface ProductResultHeroProps {
  nutriScoreGrade: string | null | undefined;
  product: ProductHeaderData;
}

export function ProductResultHero({ nutriScoreGrade, product }: ProductResultHeroProps) {
  return (
    <View className="px-4 pb-4">
      <ProductResultHeader product={product} />
      <NutriScoreBlock grade={nutriScoreGrade} />
    </View>
  );
}
