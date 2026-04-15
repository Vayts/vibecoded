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
  previewImageUri?: string | null;
  product: ProductHeaderData;
}

export function ProductResultHero({
  nutriScoreGrade,
  previewImageUri,
  product,
}: ProductResultHeroProps) {
  return (
    <View className="px-4 pb-4">
      <ProductResultHeader product={product} previewImageUri={previewImageUri} />
      <NutriScoreBlock grade={nutriScoreGrade} />
    </View>
  );
}