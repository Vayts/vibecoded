import type { ProductAnalysisResult } from '@acme/shared';
import { Barcode } from 'lucide-react-native';
import { Image, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { getProductImageUri } from './productResultHelpers';
import {
  type ProductHeaderData,
  type ProductResultHeaderChip,
  useProductResultHeaderChips,
} from './useProductResultHeaderChips';

interface ProductResultHeaderProps {
  product: ProductHeaderData;
  analysisResult?: ProductAnalysisResult;
  hasPreviewAllergenConflict?: boolean;
}

const CHIP_TONES: Record<
  ProductResultHeaderChip['tone'],
  { backgroundColor: string; borderColor: string; textColor: string }
> = {
  success: {
    backgroundColor: COLORS.successSoft,
    borderColor: COLORS.successBorder,
    textColor: COLORS.success,
  },
  warning: {
    backgroundColor: COLORS.warningSoft,
    borderColor: COLORS.warningBorder,
    textColor: COLORS.warning,
  },
  danger: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.dangerBorder,
    textColor: COLORS.danger,
  },
};

export function ProductResultHeader({
  product,
  analysisResult,
  hasPreviewAllergenConflict,
}: ProductResultHeaderProps) {
  const resolvedImageUrl = getProductImageUri(product);
  const chips = useProductResultHeaderChips({
    product,
    analysisResult,
    hasPreviewAllergenConflict,
  });

  return (
    <View className="rounded-xl bg-white pt-4">
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

        <View className="flex-1">
          <Typography variant="sectionTitle" className="text-neutrals-900 pr-5">
            {product.product_name ?? 'Unknown product'}
          </Typography>
          {product.brands ? (
            <Typography variant="bodySecondary" className="mt-1 text-neutrals-900">
              {product.brands}
            </Typography>
          ) : null}

          {chips.length > 0 ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {chips.map((chip) => {
                const tone = CHIP_TONES[chip.tone];

                return (
                  <View
                    key={chip.key}
                    accessibilityLabel={chip.accessibilityLabel ?? chip.label}
                    className="rounded-md border px-2 py-0.5"
                    style={{
                      backgroundColor: tone.backgroundColor,
                      borderColor: tone.borderColor,
                    }}
                  >
                    <Typography
                      variant="fieldLabel"
                      className="font-medium normal-case tracking-normal"
                      style={{ color: tone.textColor }}
                    >
                      {chip.label}
                    </Typography>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
