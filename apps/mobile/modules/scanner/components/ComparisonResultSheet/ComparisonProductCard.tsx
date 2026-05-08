import { Trophy } from 'lucide-react-native';
import { Image, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { resolveStorageUri } from '../../../../shared/lib/storage/resolveStorageUri';
import type { ComparedProductCore } from '../../utils/profileCompareTypes';
import { useMemo } from 'react';
import { formatOverallRatingColors } from '../ScannerResultSheet/evaluationHelpers';
import type { ComparisonSafetyBadge } from './comparisonSafetyBadges';
import { getMascotByProductKey } from './comparisonMascots';

import BestMascot from '../../../../assets/icons/mascot/best-mascot.svg';
import BestMascot2 from '../../../../assets/icons/mascot/best-mascot-2.svg';
import BestMascot3 from '../../../../assets/icons/mascot/best-mascot-3.svg';
import BestMascot4 from '../../../../assets/icons/mascot/best-mascot-4.svg';
import BestMascot5 from '../../../../assets/icons/mascot/best-mascot-5.svg';

interface ComparisonProductCardProps {
  product: ComparedProductCore;
  productKey?: string;
  score: number | null;
  safetyBadges?: ComparisonSafetyBadge[];
  badgeLabel?: string;
  tone: 'winner' | 'neutral' | 'not-suitable';
}

export function ComparisonProductCard({
  product,
  productKey,
  score,
  safetyBadges = [],
  badgeLabel,
  tone,
}: ComparisonProductCardProps) {
  const resolvedImageUrl = resolveStorageUri(product.imageUrl);
  const isWinner = tone === 'winner';
  const isRejected = tone === 'not-suitable';
  const productName = product.name?.trim() || 'Unknown product';
  const winnerMascot = getMascotByProductKey(productKey || productName);
  const WinnerMascot = winnerMascot.Component;
  const colors = useMemo(() => {
    if (score == null)
      return {
        backgroundColor: COLORS.gray100,
        textColor: COLORS.gray500,
      };

    return formatOverallRatingColors(score);
  }, [score]);

  const borderColor = isRejected ? COLORS.danger500 : isWinner ? COLORS.primary300 : COLORS.gray200;
  const badgeBackgroundColor = isRejected
    ? COLORS.dangerSoft
    : isWinner
      ? COLORS.primary100
      : COLORS.gray100;
  const badgeTextColor = isRejected ? COLORS.danger800 : isWinner ? COLORS.neutrals900 : COLORS.gray500;
  const safetyBadgeColors = {
    negative: {
      backgroundColor: COLORS.dangerSoft,
      borderColor: COLORS.dangerBorder,
      textColor: COLORS.danger800,
    },
    positive: {
      backgroundColor: COLORS.successSoft,
      borderColor: COLORS.successBorder,
      textColor: COLORS.primary900,
    },
  } as const;

  return (
    <View className="flex-1 self-stretch pt-4">
      {badgeLabel ? (
        <View
          className={`absolute left-0 ${isWinner ? 'left-3' : 'right-0'} top-0 z-20 items-center`}
        >
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

      <View className="flex-1 rounded-[16px] border bg-white px-3 pb-4 pt-4" style={{ borderColor }}>
        <View>
          {resolvedImageUrl ? (
            <Image
              source={{ uri: resolvedImageUrl }}
              className="h-[130px] w-full rounded-[16px] bg-gray-50"
              resizeMode="cover"
            />
          ) : (
            <View className="h-[130px] w-full items-center justify-center rounded-[16px] bg-gray-50">
              <Typography variant="sectionTitle" className="text-gray-300">
                📦
              </Typography>
            </View>
          )}
          {isWinner ? (
            <View className="absolute right-2" style={{ bottom: `${winnerMascot.bottomPercent}%` }}>
              <WinnerMascot />
            </View>
          ) : null}
        </View>

        <Typography
          variant="headerTitle"
          numberOfLines={1}
          className="mt-2 text-center text-[15px] font-bold"
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

        <View
          className="mt-2 flex-row items-center justify-between px-2 py-1 rounded-[6px]"
          style={{ backgroundColor: `${colors.backgroundColor}80` }}
        >
          <Typography
            variant="caption"
            className="text-center uppercase font-bold text-[8px] text-gray-500"
          >
            Chozr score
          </Typography>
          <Typography
            variant="sectionTitle"
            className="text-center text-[12px] text-gray-900"
            style={{ color: colors.textColor }}
          >
            {score || '-'}
            <Typography className="text-[12px] font-bold" style={{ color: colors.textColor }}>
              /100
            </Typography>
          </Typography>
        </View>

        {safetyBadges.length > 0 ? (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {safetyBadges.map((badge) => {
              const Icon = badge.Icon;
              const colors = safetyBadgeColors[badge.tone];

              return (
                <View
                  key={badge.key}
                  className="flex-row items-center rounded-full border px-2 py-1"
                  style={{
                    backgroundColor: colors.backgroundColor,
                    borderColor: colors.borderColor,
                  }}
                >
                  <Icon color={colors.textColor} size={12} strokeWidth={2.2} />
                  <Typography
                    variant="caption"
                    className="ml-1 text-[10px]"
                    style={{ color: colors.textColor }}
                  >
                    {badge.label}
                  </Typography>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}
