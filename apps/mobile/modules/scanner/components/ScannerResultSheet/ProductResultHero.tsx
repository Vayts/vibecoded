import { View } from 'react-native';

import { ProductResultHeader } from './ProductResultHeader';
import type { ProductHeaderData } from './useProductResultHeaderChips';

interface ProductResultHeroProps {
  nutriScoreGrade: string | null | undefined;
  product: ProductHeaderData;
}

export function ProductResultHero({ product }: ProductResultHeroProps) {
  return (
    <View className="px-4 pb-4">
      <ProductResultHeader product={product} />
    </View>
  );
}
