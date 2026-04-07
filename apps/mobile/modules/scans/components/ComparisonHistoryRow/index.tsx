import type { ComparisonHistoryItem } from '@acme/shared';
import { Barcode, ClockFading } from 'lucide-react-native';
import { Image, TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { resolveStorageUri } from '../../../../shared/lib/storage/resolveStorageUri';

interface ComparisonHistoryRowProps {
  item: ComparisonHistoryItem;
  onPress: (item: ComparisonHistoryItem) => void;
}

const formatRelativeTime = (dateString: string): string => {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(dateString).toLocaleDateString();
};

function ComparisonProductLine({
  imageUrl,
  label,
  name,
}: {
  imageUrl: string | null;
  label: string;
  name: string;
}) {
  const uri = resolveStorageUri(imageUrl);
  return (
    <View className="flex-row items-center gap-2">
      {uri ? (
        <Image source={{ uri }} className="h-5 w-5 rounded bg-gray-100" resizeMode="cover" />
      ) : (
        <View className="h-5 w-5 items-center justify-center rounded bg-blue-50">
          <Barcode color={COLORS.primary} size={10} />
        </View>
      )}
      <Typography variant="bodySecondary" numberOfLines={1} className="flex-1">
        <Typography variant="bodySecondary" className="font-medium">
          {label}:
        </Typography>{' '}
        {name}
      </Typography>
    </View>
  );
}

export function ComparisonHistoryRow({ item, onPress }: ComparisonHistoryRowProps) {
  const product1Name = item.product1?.product_name ?? 'Unknown';
  const product2Name = item.product2?.product_name ?? 'Unknown';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      className="px-4 py-3 border-b border-gray-100"
      accessibilityRole="button"
      accessibilityLabel={`View comparison of ${product1Name} and ${product2Name}`}
    >
      <Typography variant="headerTitle" numberOfLines={1}>
        Comparison
      </Typography>

      <View className="mt-1.5 gap-1">
        <ComparisonProductLine
          imageUrl={item.product1?.image_url ?? null}
          label="Product 1"
          name={product1Name}
        />
        <ComparisonProductLine
          imageUrl={item.product2?.image_url ?? null}
          label="Product 2"
          name={product2Name}
        />
      </View>

      <View className="mt-2 flex-row items-center gap-1">
        <ClockFading size={16} color={COLORS.neutrals500} strokeWidth={1.5} />
        <Typography className="text-neutrals-500 text-[13px]">
          {formatRelativeTime(item.createdAt)}
        </Typography>
      </View>
    </TouchableOpacity>
  );
}
