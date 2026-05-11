import { Barcode } from 'lucide-react-native';
import { Image, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { getProductImageUri } from './productResultHelpers';
import { type ProductHeaderData } from './useProductResultHeaderChips';
import { ProfileScoreSelector, ProfileScoreSelectorItem } from './ProfileScoreSelector';

interface ProductResultHeaderProps {
  product: ProductHeaderData;
  profiles: ProfileScoreSelectorItem[];
  selectedProfileId: string;
  onSelect: (profileId: string) => void;
}

export function ProductResultHeader({
  product,
  profiles,
  selectedProfileId,
  onSelect,
}: ProductResultHeaderProps) {
  const resolvedImageUrl = getProductImageUri(product);
  const productName = product.product_name?.trim() || '';
  const englishProductName = product.product_name_english?.trim() || '';
  const resolvedProductName = productName || englishProductName || 'Unknown product';

  console.log(product);

  const shouldShowEnglishName =
    productName.length > 0 &&
    englishProductName.length > 0 &&
    englishProductName.toLowerCase() !== productName.toLowerCase();

  return (
    <View className="rounded-xl bg-white pt-4">
      <View className="flex-row gap-2">
        {resolvedImageUrl ? (
          <Image
            source={{ uri: resolvedImageUrl }}
            className="h-[90px] w-[90px] rounded-xl bg-gray-100"
            resizeMode="cover"
          />
        ) : (
          <View className="h-[90px] w-[90px] items-center justify-center rounded-xl bg-blue-50">
            <Barcode color={COLORS.primary} size={26} />
          </View>
        )}

        <View className="flex-1">
          <Typography variant="sectionTitle" className="text-neutrals-900 pr-5">
            {resolvedProductName}
          </Typography>
          {shouldShowEnglishName ? (
            <Typography variant="bodySecondary" className="mt-1 text-neutrals-700">
              English: {englishProductName}
            </Typography>
          ) : null}
          {product.brands ? (
            <Typography variant="bodySecondary" className="mt-1 text-neutrals-900">
              {product.brands}
            </Typography>
          ) : null}
        </View>
      </View>

      <ProfileScoreSelector
        className="mt-2"
        profiles={profiles}
        selectedProfileId={selectedProfileId}
        onSelect={onSelect}
      />
    </View>
  );
}
