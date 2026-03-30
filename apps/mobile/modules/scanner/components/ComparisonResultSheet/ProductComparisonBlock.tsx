import type { ProductPreview } from '@acme/shared';
import { Image, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

function ProductMiniHeader({
  product,
  label,
  isWinner,
}: {
  product: ProductPreview;
  label: string;
  isWinner: boolean;
}) {
  return (
    <View className="mb-3 flex-row items-center gap-3">
      {product.image_url ? (
        <Image
          source={{ uri: product.image_url }}
          className="h-10 w-10 rounded-lg bg-gray-100"
          resizeMode="contain"
        />
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
          <Typography variant="caption" className="text-gray-300">
            📦
          </Typography>
        </View>
      )}
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Typography variant="headerTitle" numberOfLines={1} className="flex-1">
            {product.product_name ?? label}
          </Typography>
          {isWinner ? (
            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: COLORS.successSoft }}>
              <Typography variant="caption" className="font-semibold" style={{ color: COLORS.success }}>
                Better
              </Typography>
            </View>
          ) : null}
        </View>
        {product.brands ? (
          <Typography variant="caption" numberOfLines={1}>
            {product.brands}
          </Typography>
        ) : null}
      </View>
    </View>
  );
}

function BulletItem({ text, type }: { text: string; type: 'positive' | 'negative' }) {
  const dotColor = type === 'positive' ? COLORS.success : COLORS.danger;
  const prefix = type === 'positive' ? '+' : '−';

  return (
    <View className="flex-row items-start gap-2 py-1">
      <Typography
        variant="bodySecondary"
        className="w-4 text-center font-semibold"
        style={{ color: dotColor }}
      >
        {prefix}
      </Typography>
      <Typography variant="bodySecondary" className="flex-1 text-gray-700">
        {text}
      </Typography>
    </View>
  );
}

interface ProductComparisonBlockProps {
  product: ProductPreview;
  comparison: { positives: string[]; negatives: string[] };
  label: string;
  isWinner: boolean;
}

export function ProductComparisonBlock({
  product,
  comparison,
  label,
  isWinner,
}: ProductComparisonBlockProps) {
  const hasItems = comparison.positives.length > 0 || comparison.negatives.length > 0;

  return (
    <View className="rounded-2xl border border-gray-100 bg-white p-4">
      <ProductMiniHeader product={product} label={label} isWinner={isWinner} />
      {hasItems ? (
        <View>
          {comparison.positives.map((text, i) => (
            <BulletItem key={`p-${i}`} text={text} type="positive" />
          ))}
          {comparison.negatives.map((text, i) => (
            <BulletItem key={`n-${i}`} text={text} type="negative" />
          ))}
        </View>
      ) : (
        <Typography variant="bodySecondary" className="text-gray-400">
          No notable differences
        </Typography>
      )}
    </View>
  );
}
