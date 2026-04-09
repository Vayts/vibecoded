import type { ScanHistoryItem } from '@acme/shared';
import { Barcode, ClockFading, Heart } from 'lucide-react-native';
import { Image, TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { resolveStorageUri } from '../../../../shared/lib/storage/resolveStorageUri';
import type { ProfileScoreChipContext } from '../../hooks/useProfileScoreChipContext';
import { useToggleFavouriteMutation } from '../../hooks/useFavouritesQuery';
import { ProfileScoreChips } from '../ProfileScoreChips';
import { colors } from 'react-native-keyboard-controller/lib/typescript/components/KeyboardToolbar/colors';

interface ScanHistoryRowProps {
  item: ScanHistoryItem;
  onPress: (item: ScanHistoryItem) => void;
  profileScoreChipContext: ProfileScoreChipContext;
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

export function ScanHistoryRow({ item, onPress, profileScoreChipContext }: ScanHistoryRowProps) {
  const imageUri = resolveStorageUri(item.product?.image_url) ?? null;
  const productName = item.product?.product_name ?? 'Unknown product';
  const brands = item.product?.brands ?? null;
  const score = item.personalScore ?? item.overallScore;
  const isPersonalScore = item.personalScore != null;
  const hasProfileChips = Boolean(item.profileChips?.length);

  const productId = item.product?.id ?? null;
  const isFavourite = item.isFavourite ?? false;
  const { toggle } = useToggleFavouriteMutation();

  const handleToggleFavourite = () => {
    if (!productId) return;
    toggle(productId, isFavourite);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      className="flex-row items-center px-4 py-3"
      accessibilityRole="button"
      accessibilityLabel={`View scan result for ${productName}`}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          className="h-[74px] w-[74px] rounded-xl bg-gray-100 self-start"
          resizeMode="cover"
        />
      ) : (
        <View className="h-[74px] w-[74px] items-center justify-center rounded-xl bg-blue-50">
          <Barcode color={COLORS.primary} size={20} />
        </View>
      )}

      <View className="ml-3 flex-1">
        <Typography className="text-[14px] font-semibold" numberOfLines={1}>
          {productName}
        </Typography>
        {brands ? (
          <Typography className="text-[13px] mt-0.5" numberOfLines={1}>
            {brands}
          </Typography>
        ) : null}

        <View className="mt-2 items-start">
          {hasProfileChips ? (
            <ProfileScoreChips chips={item.profileChips!} context={profileScoreChipContext} />
          ) : score != null ? (
            <View className="min-w-[40px] items-center rounded-lg px-2 py-1">
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
            <ClockFading size={16} color={COLORS.neutrals500} strokeWidth={1.5} />
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
            color={isFavourite ? COLORS.accent500 : COLORS.neutrals900}
            fill={isFavourite ? COLORS.accent500 : 'none'}
          />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}
