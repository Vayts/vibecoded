import type { BarcodeLookupProduct } from '@acme/shared';
import { Barcode } from 'lucide-react-native';
import { Image, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { getProductImageUri } from './productResultHelpers';
import { FavouriteButton } from './FavouriteButton';

interface ProductResultHeaderProps {
  product: BarcodeLookupProduct;
  previewImageUri?: string | null;
  productId?: string | null;
  isFavourite?: boolean;
}

export function ProductResultHeader({
  product,
  previewImageUri,
  productId,
  isFavourite,
}: ProductResultHeaderProps) {
  const imageUri = getProductImageUri(product, previewImageUri);

  return (
    <View className="rounded-xl border border-gray-100 bg-white px-4 py-4">
      {productId ? (
        <View className="absolute right-2 top-2 z-10">
          <FavouriteButton productId={productId} initialIsFavourite={isFavourite ?? false} />
        </View>
      ) : null}
      <View className="flex-row gap-4">
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            className="h-20 w-20 rounded-xl bg-gray-100"
            resizeMode="cover"
          />
        ) : (
          <View className="h-20 w-20 items-center justify-center rounded-xl bg-blue-50">
            <Barcode color={COLORS.primary} size={26} />
          </View>
        )}

        <View className="mr-8 flex-1 justify-center">
          <Typography variant="sectionTitle" className="text-gray-900">
            {product.product_name ?? 'Unknown product'}
          </Typography>
          {product.brands ? (
            <Typography variant="bodySecondary" className="mt-1 text-gray-600">
              {product.brands}
            </Typography>
          ) : null}
        </View>
      </View>
    </View>
  );
}
