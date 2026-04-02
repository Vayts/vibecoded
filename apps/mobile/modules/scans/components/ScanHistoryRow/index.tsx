import type { ScanHistoryItem } from '@acme/shared';
import { Barcode, ClockFading, Heart } from 'lucide-react-native';
import { useState } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { resolveStorageUri } from '../../../../shared/lib/storage/resolveStorageUri';
import { useToggleFavouriteMutation } from '../../hooks/useFavouritesQuery';

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

const truncateName = (name: string, maxLen = 8): string =>
  name.length > maxLen ? name.slice(0, maxLen - 1) + '…' : name;

function ProfileScoreChips({ chips }: { chips: NonNullable<ScanHistoryItem['profileChips']> }) {
  return (
    <View className="flex-row flex-wrap justify-end gap-1">
      {chips.map((chip) => {
        const color = getScoreColor(chip.score);
        return (
          <View
            key={chip.profileId}
            className="flex-row items-center rounded-md px-1.5 py-0.5 border"
            style={{ borderColor: color + '1A' }}
          >
            <Typography
              variant="caption"
              style={{ color, fontSize: 11, lineHeight: 14 }}
              numberOfLines={1}
            >
              {truncateName(chip.name)} {chip.score}
            </Typography>
          </View>
        );
      })}
    </View>
  );
}

export function ScanHistoryRow({ item, onPress }: ScanHistoryRowProps) {
  const imageUri = resolveStorageUri(item.product?.image_url) ?? null;
  const productName = item.product?.product_name ?? 'Unknown product';
  const brands = item.product?.brands ?? null;
  const score = item.personalScore ?? item.overallScore;
  const isPersonalScore = item.personalScore != null;
  const hasProfileChips = item.profileChips && item.profileChips.length > 0;

  const productId = item.product?.id ?? null;
  const [isFavourite, setIsFavourite] = useState(item.isFavourite ?? false);
  const { toggle } = useToggleFavouriteMutation();

  const handleToggleFavourite = () => {
    if (!productId) return;
    setIsFavourite((prev) => !prev);
    toggle(productId, isFavourite);
  };

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
          className="h-14 w-14 rounded-xl bg-gray-100 self-start"
          resizeMode="cover"
        />
      ) : (
        <View className="h-14 w-14 items-center justify-center rounded-xl bg-blue-50">
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

        <View className="mt-2 items-start">
        {hasProfileChips ? (
          <ProfileScoreChips chips={item.profileChips!} />
        ) : score != null ? (
          <View
            className="min-w-[40px] items-center rounded-lg px-2 py-1"

          >
            <Typography variant="buttonSmall" style={{ color: getScoreColor(score) }}>
              {score}
            </Typography>
          </View>
        ) : (
          <Typography variant="caption">—</Typography>
        )}
        {!isPersonalScore && !hasProfileChips && item.personalAnalysisStatus === 'pending' ? (
          <Typography variant="caption" className="mt-0.5 text-amber-600">
            Analyzing…
          </Typography>
        ) : null}
        <View className="mt-2 flex-row items-center gap-1">
          <ClockFading size={16} color={COLORS.neutrals500} strokeWidth={1.5}/>
          <Typography className="text-neutrals-500 text-[13px]">
            {formatRelativeTime(item.createdAt)}
          </Typography>
        </View>
        </View>
      </View>

      {productId ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleToggleFavourite}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="ml-2 h-11 w-11 items-center self-start justify-center"
          accessibilityRole="button"
          accessibilityLabel={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Heart
            size={20}
            color={isFavourite ? COLORS.accent500 : '#D1D5DB'}
            fill={isFavourite ? COLORS.accent500 : 'none'}
          />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}
