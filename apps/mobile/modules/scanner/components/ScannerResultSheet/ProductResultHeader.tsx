import type { BarcodeLookupProduct, ProductPreview } from '@acme/shared';
import { Barcode } from 'lucide-react-native';
import { Image, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { getProductImageUri } from './productResultHelpers';
import { FavouriteButton } from './FavouriteButton';

type ProductHeaderData = BarcodeLookupProduct | ProductPreview;

interface ProductResultHeaderProps {
  product: ProductHeaderData;
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
  const resolvedImageUrl = getProductImageUri(product, previewImageUri);

  return (
    <View className="rounded-xl bg-white pt-4">
      {productId ? (
        <View className="absolute right-0 top-2 z-10">
          <FavouriteButton productId={productId} isFavourite={isFavourite ?? false} />
        </View>
      ) : null}
      <View className="flex-row gap-4">
        {resolvedImageUrl ? (
          <Image
            source={{ uri: resolvedImageUrl }}
            className="h-20 w-20 rounded-xl bg-gray-100"
            resizeMode="cover"
          />
        ) : (
          <View className="h-20 w-20 items-center justify-center rounded-xl bg-blue-50">
            <Barcode color={COLORS.primary} size={26} />
          </View>
        )}

        <View className="mr-12 flex-1">
          <Typography variant="sectionTitle" className="text-neutrals-900 pr-5">
            {product.product_name ?? 'Unknown product'}
          </Typography>
          {product.brands ? (
            <Typography variant="bodySecondary" className="mt-1 text-neutrals-900">
              {product.brands}
            </Typography>
          ) : null}
        </View>
      </View>
    </View>
  );
}
