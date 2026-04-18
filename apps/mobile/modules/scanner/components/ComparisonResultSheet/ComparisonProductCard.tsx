import type { ComparisonProductPreview } from '@acme/shared';
import { Trophy } from 'lucide-react-native';
import { Image, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { resolveStorageUri } from '../../../../shared/lib/storage/resolveStorageUri';

const NUTRI_COLORS: Record<string, string> = {
  a: COLORS.nutriScoreA,
  b: COLORS.nutriScoreB,
  c: COLORS.nutriScoreC,
  d: COLORS.nutriScoreD,
  e: COLORS.nutriScoreE,
};

function NutriScoreBadge({ grade }: { grade: string | null }) {
  if (!grade) return null;
  const g = grade.toLowerCase();
  const bg = NUTRI_COLORS[g] ?? COLORS.gray300;

  return (
    <View
      className="h-[29px] w-[29px] items-center justify-center rounded-xl border-4 border-white"
      style={{ backgroundColor: bg }}
    >
      <Typography variant="buttonSmall" className="font-bold text-white">
        {g.toUpperCase()}
      </Typography>
    </View>
  );
}

interface ComparisonProductCardProps {
  product: ComparisonProductPreview;
  badgeLabel?: string;
  tone: 'winner' | 'neutral' | 'not-suitable';
}

export function ComparisonProductCard({
  product,
  badgeLabel,
  tone,
}: ComparisonProductCardProps) {
  const resolvedImageUrl = resolveStorageUri(product.image_url);
  const isWinner = tone === 'winner';
  const isRejected = tone === 'not-suitable';
  const productName = product.product_name?.trim() || 'Unknown product';
  const grade = product.nutrition.nutriscore_grade ?? product.nutriscore_grade ?? null;

  const borderColor = isRejected
    ? COLORS.danger500
    : isWinner
      ? COLORS.primary300
      : COLORS.gray200;
  const badgeBackgroundColor = isRejected
    ? COLORS.dangerSoft
    : isWinner
      ? COLORS.primary100
      : COLORS.gray100;
  const badgeTextColor = isRejected ? COLORS.danger800 : isWinner ? COLORS.primary900 : COLORS.gray500;

  return (
    <View className="flex-1 pt-4">
      {badgeLabel ? (
        <View className="absolute left-0 right-0 top-0 z-20 items-center">
          <View
            className="flex-row items-center rounded-full border-[3px] border-white px-3 py-1"
            style={{ backgroundColor: badgeBackgroundColor, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}
          >
            {isWinner ? <Trophy color={badgeTextColor} size={14} strokeWidth={2.2} /> : null}
            <Typography variant="buttonSmall" className={isWinner ? 'ml-1.5' : ''} style={{ color: badgeTextColor }}>
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

        {grade && grade !== 'unknown' ? (
          <View className="-mt-4 items-center">
            <NutriScoreBadge grade={grade} />
          </View>
        ) : null}

        <Typography
          variant="headerTitle"
          numberOfLines={2}
          className={grade && grade !== 'unknown' ? 'mt-3 text-center text-[15px] font-bold' : 'mt-5 text-center text-[15px] font-bold'}
        >
          {productName}
        </Typography>

        {product.brands ? (
          <Typography variant="bodySecondary" numberOfLines={1} className="mt-2 text-center text-gray-500">
            {product.brands}
          </Typography>
        ) : null}
      </View>
    </View>
  );
}
