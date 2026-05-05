import { Trophy } from 'lucide-react-native';
import { Image, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { resolveStorageUri } from '../../../../shared/lib/storage/resolveStorageUri';
import type { ComparedProductCore } from '../../utils/profileCompareTypes';

interface ComparisonProductCardProps {
  product: ComparedProductCore;
  badgeLabel?: string;
  tone: 'winner' | 'neutral' | 'not-suitable';
}

export function ComparisonProductCard({ product, badgeLabel, tone }: ComparisonProductCardProps) {
  const resolvedImageUrl = resolveStorageUri(product.imageUrl);
  const isWinner = tone === 'winner';
  const isRejected = tone === 'not-suitable';
  const productName = product.name?.trim() || 'Unknown product';

  const borderColor = isRejected ? COLORS.danger500 : isWinner ? COLORS.primary300 : COLORS.gray200;
  const badgeBackgroundColor = isRejected
    ? COLORS.dangerSoft
    : isWinner
      ? COLORS.primary100
      : COLORS.gray100;
  const badgeTextColor = isRejected
    ? COLORS.danger800
    : isWinner
      ? COLORS.primary900
      : COLORS.gray500;

  return (
    <View className="flex-1 pt-4">
      {badgeLabel ? (
        <View className="absolute left-0 right-0 top-0 z-20 items-center">
          <View
            className="flex-row items-center rounded-full border-[3px] border-white px-3 py-1"
            style={{
              backgroundColor: badgeBackgroundColor,
              shadowColor: COLORS.black,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            {isWinner ? <Trophy color={badgeTextColor} size={14} strokeWidth={2.2} /> : null}
            <Typography
              variant="buttonSmall"
              className={isWinner ? 'ml-1.5' : ''}
              style={{ color: badgeTextColor }}
            >
              {badgeLabel}
            </Typography>
          </View>
        </View>
      ) : null}

      <View
        className="rounded-[20px] border bg-white px-3 pb-4 pt-4"
        style={{ borderColor, borderWidth: isWinner ? 2 : 1.5 }}
      >
        {resolvedImageUrl ? (
          <Image
            source={{ uri: resolvedImageUrl }}
            className="h-[88px] w-full rounded-[16px] bg-gray-50"
            resizeMode="cover"
          />
        ) : (
          <View className="h-[88px] w-full items-center justify-center rounded-[16px] bg-gray-50">
            <Typography variant="sectionTitle" className="text-gray-300">
              📦
            </Typography>
          </View>
        )}

        <View className="h-[23px] -mt-4 items-center" />

        <Typography
          variant="headerTitle"
          numberOfLines={1}
          className="mt-5 text-center text-[15px] font-bold"
        >
          {productName}
        </Typography>

        {product.brand ? (
          <Typography
            variant="bodySecondary"
            numberOfLines={1}
            className="mt-2 text-center text-gray-500"
          >
            {product.brand}
          </Typography>
        ) : null}
      </View>
    </View>
  );
}
