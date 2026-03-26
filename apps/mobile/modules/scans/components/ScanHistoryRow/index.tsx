import type { ScanHistoryItem } from '@acme/shared';
import { Barcode } from 'lucide-react-native';
import { Image, TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface ScanHistoryRowProps {
  item: ScanHistoryItem;
  onPress: (item: ScanHistoryItem) => void;
}

const getScoreColor = (score: number): string => {
  if (score >= 70) return COLORS.success;
  if (score >= 40) return COLORS.warning;
  return COLORS.danger;
};

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

export function ScanHistoryRow({ item, onPress }: ScanHistoryRowProps) {
  const imageUri = item.product?.image_url ?? null;
  const productName = item.product?.product_name ?? 'Unknown product';
  const brands = item.product?.brands ?? null;
  const score = item.personalScore ?? item.overallScore;
  const isPersonalScore = item.personalScore != null;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      className="flex-row items-center px-4 py-3 border-b border-gray-100"
      accessibilityRole="button"
      accessibilityLabel={`View scan result for ${productName}`}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          className="h-12 w-12 rounded-xl bg-gray-100"
          resizeMode="cover"
        />
      ) : (
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
          <Barcode color={COLORS.primary} size={20} />
        </View>
      )}

      <View className="ml-3 flex-1">
        <Typography variant="headerTitle" numberOfLines={1}>
          {productName}
        </Typography>
        {brands ? (
          <Typography variant="bodySecondary" numberOfLines={1} className="mt-0.5">
            {brands}
          </Typography>
        ) : null}
        <Typography variant="caption" className="mt-0.5">
          {formatRelativeTime(item.createdAt)}
        </Typography>
      </View>

      <View className="ml-3 items-end">
        {score != null ? (
          <View
            className="min-w-[40px] items-center rounded-lg px-2 py-1"
            style={{ backgroundColor: getScoreColor(score) + '1A' }}
          >
            <Typography variant="buttonSmall" style={{ color: getScoreColor(score) }}>
              {score}
            </Typography>
          </View>
        ) : (
          <Typography variant="caption">—</Typography>
        )}
        {!isPersonalScore && item.personalAnalysisStatus === 'pending' ? (
          <Typography variant="caption" className="mt-0.5 text-amber-600">
            Analyzing…
          </Typography>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
