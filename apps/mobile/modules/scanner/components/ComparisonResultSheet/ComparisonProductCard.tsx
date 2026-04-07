import type { ComparisonProductPreview } from '@acme/shared';
import { Image, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { resolveStorageUri } from '../../../../shared/lib/storage/resolveStorageUri';

const NUTRI_COLORS: Record<string, string> = {
  a: '#038141',
  b: '#85BB2F',
  c: '#FECB02',
  d: '#EE8100',
  e: '#E63E11',
};

function NutriScoreBadge({ grade }: { grade: string | null }) {
  if (!grade) return null;
  const g = grade.toLowerCase();
  const bg = NUTRI_COLORS[g] ?? COLORS.gray300;

  return (
    <View
      className="h-6 w-6 items-center justify-center rounded-md"
      style={{ backgroundColor: bg }}
    >
      <Typography variant="caption" className="font-bold text-white">
        {g.toUpperCase()}
      </Typography>
    </View>
  );
}

interface ComparisonProductCardProps {
  product: ComparisonProductPreview;
  label: string;
  isWinner: boolean;
  isNeither?: boolean;
}

export function ComparisonProductCard({ product, label, isWinner, isNeither }: ComparisonProductCardProps) {
  const resolvedImageUrl = resolveStorageUri(product.image_url);

  const borderColor = isNeither
    ? COLORS.danger
    : isWinner
      ? COLORS.success
      : COLORS.gray200;
  const bgColor = isNeither
    ? COLORS.dangerSoft
    : isWinner
      ? COLORS.successSoft
      : COLORS.white;
  const borderWidth = isWinner || isNeither ? 1.5 : 1;

  return (
    <View
      className="flex-1 rounded-2xl border p-3"
      style={{ borderColor, backgroundColor: bgColor, borderWidth }}
    >
      {isWinner ? (
        <View
          className="mb-2 self-start rounded-full px-2 py-0.5"
          style={{ backgroundColor: COLORS.success }}
        >
          <Typography variant="caption" className="font-bold text-white">
            Best Choice
          </Typography>
        </View>
      ) : isNeither ? (
        <View
          className="mb-2 self-start rounded-full px-2 py-0.5"
          style={{ backgroundColor: COLORS.danger }}
        >
          <Typography variant="caption" className="font-bold text-white">
            Not Suitable
          </Typography>
        </View>
      ) : (
        <View className="mb-2 self-start rounded-full bg-gray-100 px-2 py-0.5">
          <Typography variant="caption" className="font-semibold text-gray-400">
            {label}
          </Typography>
        </View>
      )}

      {resolvedImageUrl ? (
        <Image
          source={{ uri: resolvedImageUrl }}
          className="mb-2 h-16 w-16 self-center rounded-xl bg-gray-50"
          resizeMode="contain"
        />
      ) : (
        <View className="mb-2 h-16 w-16 items-center justify-center self-center rounded-xl bg-gray-50">
          <Typography variant="sectionTitle" className="text-gray-300">
            📦
          </Typography>
        </View>
      )}

      <Typography
        variant="headerTitle"
        numberOfLines={2}
        className="mb-1 text-center"
      >
        {product.product_name ?? label}
      </Typography>

      {product.brands ? (
        <Typography variant="caption" numberOfLines={1} className="mb-2 text-center">
          {product.brands}
        </Typography>
      ) : null}

      <View className="flex-row items-center justify-center gap-1">
        <NutriScoreBadge grade={product.nutrition.nutriscore_grade} />
      </View>
    </View>
  );
}
