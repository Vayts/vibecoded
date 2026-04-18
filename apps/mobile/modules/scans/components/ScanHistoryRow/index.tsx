import { memo } from 'react';
import type { ScanHistoryItem } from '@acme/shared';
import { GOOD_FIT_SCORE_MIN, NEUTRAL_FIT_SCORE_MIN } from '@acme/shared';
import { Image as ExpoImage } from 'expo-image';
import { Barcode, ClockFading, EllipsisVertical } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { ConfirmationDialog } from '../../../../shared/components/ConfirmationDialog';
import { COLORS } from '../../../../shared/constants/colors';
import { resolveStorageUri } from '../../../../shared/lib/storage/resolveStorageUri';
import type { ProfileScoreChipContext } from '../../hooks/useProfileScoreChipContext';
import { ProfileScoreChips } from '../ProfileScoreChips';
import {
  ScanHistoryRowOptionsMenu,
} from './ScanHistoryRowOptionsMenu';
import { useScanHistoryRowActions } from './useScanHistoryRowActions';

interface ScanHistoryRowProps {
  item: ScanHistoryItem;
  onPress: (item: ScanHistoryItem) => void;
  profileScoreChipContext: ProfileScoreChipContext;
  onToggleFavourite: (productId: string, currentlyFavourite: boolean) => void;
}

const IMAGE_PLACEHOLDER_COLOR = COLORS.neutrals100;
const SCAN_IMAGE_SIZE = 74;
const SCAN_IMAGE_RADIUS = 12;

const getScoreColor = (score: number): string => {
  if (score >= GOOD_FIT_SCORE_MIN) return COLORS.success;
  if (score >= NEUTRAL_FIT_SCORE_MIN) return COLORS.neutrals700;
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

export const ScanHistoryRow = memo(function ScanHistoryRow({
  item,
  onPress,
  profileScoreChipContext,
  onToggleFavourite,
}: ScanHistoryRowProps) {
  const imageUri = resolveStorageUri(item.product?.image_url) ?? null;
  const productName = item.product?.product_name ?? 'Unknown product';
  const brands = item.product?.brands ?? null;
  const score = item.personalScore ?? item.overallScore;
  const isPersonalScore = item.personalScore != null;
  const hasProfileChips = Boolean(item.profileChips?.length);
  const isFavourite = item.isFavourite ?? false;
  const {
    closeMenu,
    deleteErrorMessage,
    deleteScanMutation,
    handleDeleteCancel,
    handleDeleteConfirm,
    isDeleteDialogVisible,
    isMenuVisible,
    menuActions,
    menuAnchor,
    menuTriggerRef,
    openMenu,
  } = useScanHistoryRowActions({
    isFavourite,
    item,
    onToggleFavourite,
  });

  return (
    <View className="relative">
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(item)}
        className="flex-row items-center px-4 py-3 pr-14"
        accessibilityRole="button"
        accessibilityLabel={`View scan result for ${productName}`}
      >
        {imageUri ? (
          <ExpoImage
            source={{ uri: imageUri }}
            style={{
              width: SCAN_IMAGE_SIZE,
              height: SCAN_IMAGE_SIZE,
              borderRadius: SCAN_IMAGE_RADIUS,
              alignSelf: 'flex-start',
              backgroundColor: COLORS.neutrals100,
            }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={120}
            placeholder={IMAGE_PLACEHOLDER_COLOR}
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
      </TouchableOpacity>

      <View ref={menuTriggerRef} className="absolute right-3 top-3">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={openMenu}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="h-11 w-11 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Open scan actions"
        >
          <EllipsisVertical size={20} color={COLORS.neutrals900} strokeWidth={1.9} />
        </TouchableOpacity>
      </View>

      <ScanHistoryRowOptionsMenu
        actions={menuActions}
        anchor={menuAnchor}
        visible={isMenuVisible}
        onClose={closeMenu}
      />

      <ConfirmationDialog
        visible={isDeleteDialogVisible}
        title="Delete from history?"
        description="This scan and its analysis results will be removed from your history."
        confirmLabel="Delete"
        errorMessage={deleteErrorMessage}
        isPending={deleteScanMutation.isPending}
        onCancel={handleDeleteCancel}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
      />
    </View>
  );
});
