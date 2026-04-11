import type { ScanHistoryItem } from '@acme/shared';
import { memo } from 'react';
import { Barcode } from 'lucide-react-native';
import { Image, Pressable, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { resolveStorageUri } from '../../../../shared/lib/storage/resolveStorageUri';

interface CompareProductPickerRowProps {
  item: ScanHistoryItem;
  onPress: (item: ScanHistoryItem) => void;
}

function CompareProductPickerRowComponent({
  item,
  onPress,
}: CompareProductPickerRowProps) {
  const imageUri = resolveStorageUri(item.product?.image_url) ?? null;
  const productName = item.product?.product_name ?? 'Unknown product';
  const brands = item.product?.brands ?? null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Compare with ${productName}`}
      className="min-h-[76px] flex-row items-center rounded-2xl border border-gray-100 bg-white px-3 py-3"
      onPress={() => onPress(item)}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          className="h-[52px] w-[52px] rounded-2xl bg-gray-100"
          resizeMode="cover"
        />
      ) : (
        <View className="h-[52px] w-[52px] items-center justify-center rounded-2xl bg-blue-50">
          <Barcode color={COLORS.primary} size={18} />
        </View>
      )}

      <View className="ml-3 flex-1">
        <Typography className="text-[15px] font-semibold text-gray-900" numberOfLines={1}>
          {productName}
        </Typography>
        {brands ? (
          <Typography className="mt-1 text-[13px] text-gray-500" numberOfLines={1}>
            {brands}
          </Typography>
        ) : null}
      </View>
    </Pressable>
  );
}

export const CompareProductPickerRow = memo(
  CompareProductPickerRowComponent,
  (prevProps, nextProps) =>
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.product?.image_url === nextProps.item.product?.image_url &&
    prevProps.item.product?.product_name === nextProps.item.product?.product_name &&
    prevProps.item.product?.brands === nextProps.item.product?.brands &&
    prevProps.onPress === nextProps.onPress,
);