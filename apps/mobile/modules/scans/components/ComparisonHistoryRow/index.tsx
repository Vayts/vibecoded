import type { ComparisonHistoryItem } from '@acme/shared';
import { ArrowLeftRight, Barcode } from 'lucide-react-native';
import { Image, TouchableOpacity, View } from 'react-native';
import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { resolveStorageUri } from '../../../../shared/lib/storage/resolveStorageUri';
import type { ProfileScoreChipContext } from '../../hooks/useProfileScoreChipContext';

interface ComparisonHistoryRowProps {
  item: ComparisonHistoryItem;
  onPress: (item: ComparisonHistoryItem) => void;
  profileScoreChipContext: ProfileScoreChipContext;
}

type BestFitProfile = ComparisonHistoryItem['product1BestFitProfiles'][number];

function BestFitAvatarStack({
  profiles,
  context,
}: {
  profiles: BestFitProfile[];
  context: ProfileScoreChipContext;
}) {
  if (profiles.length === 0) {
    return (
      <Typography variant="caption" className="text-right text-gray-400">
        No clear fit
      </Typography>
    );
  }

  const visibleProfiles = profiles.slice(0, 5);
  const extraProfilesCount = profiles.length - visibleProfiles.length;

  return (
    <View className="flex-row items-center justify-end">
      {visibleProfiles.map((profile, index) => {
        const isCurrentUser = profile.profileId === 'you';
        const familyMember = context.familyMembersById.get(profile.profileId);

        return (
          <View
            key={profile.profileId}
            style={{
              marginLeft: index === 0 ? 0 : -4,
              zIndex: visibleProfiles.length - index,
            }}
          >
            <UserAvatar
              imageUrl={isCurrentUser ? context.currentUser?.avatarUrl ?? null : familyMember?.avatarUrl ?? null}
              fallbackImageUrl={isCurrentUser ? context.currentUser?.image ?? null : null}
              name={profile.profileName}
              size="xss"
              className="border-2 border-neutrals-300"
            />
          </View>
        );
      })}

      {extraProfilesCount > 0 ? (
        <View
          className="ml-1 h-[26px] min-w-[26px] items-center justify-center rounded-full border-2 border-white px-1"
          style={{ backgroundColor: COLORS.gray100 }}
        >
          <Typography variant="caption" className="font-semibold text-gray-700">
            +{extraProfilesCount}
          </Typography>
        </View>
      ) : null}
    </View>
  );
}

function ComparisonProductCard({
  imageUrl,
  name,
  brand,
  bestFitProfiles,
  profileScoreChipContext,
}: {
  imageUrl: string | null;
  name: string;
  brand: string | null;
  bestFitProfiles: BestFitProfile[];
  profileScoreChipContext: ProfileScoreChipContext;
}) {
  const uri = resolveStorageUri(imageUrl);

  return (
    <View
      className="flex-1 rounded-[16px] border border-neutrals-100 shadow-sm bg-white p-3"
      style={{
        borderColor: COLORS.gray200,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.06,
        shadowRadius: 18,
        elevation: 3,
      }}
    >
      <View className="h-[68px] overflow-hidden rounded-[10px] bg-gray-100">
        {uri ? (
          <Image source={{ uri }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center bg-blue-50">
            <Barcode color={COLORS.primary} size={22} />
          </View>
        )}
      </View>

      <View className="mt-3">
        <Typography className="text-[17px] font-semibold leading-[24px] text-gray-900" numberOfLines={1}>
          {name}
        </Typography>
        {brand ? (
          <Typography className="mt-1 text-[13px] leading-[19px] text-gray-700" numberOfLines={2}>
            {brand}
          </Typography>
        ) : null}
      </View>

      <View className="mt-2 flex-row items-center min-h-[24px] justify-between gap-3">
        <Typography className="flex-1 text-[12px] font-semibold text-neutrals-500">
          Best fit for:
        </Typography>
        <BestFitAvatarStack profiles={bestFitProfiles} context={profileScoreChipContext} />
      </View>
    </View>
  );
}

export function ComparisonHistoryRow({
  item,
  onPress,
  profileScoreChipContext,
}: ComparisonHistoryRowProps) {
  const product1Name = item.product1?.product_name ?? 'Unknown product';
  const product2Name = item.product2?.product_name ?? 'Unknown product';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      className="relative"
      accessibilityRole="button"
      accessibilityLabel={`View comparison of ${product1Name} and ${product2Name}`}
    >
      <View className="flex-row gap-3">
        <ComparisonProductCard
          imageUrl={item.product1?.image_url ?? null}
          name={product1Name}
          brand={item.product1?.brands ?? null}
          bestFitProfiles={item.product1BestFitProfiles}
          profileScoreChipContext={profileScoreChipContext}
        />
        <ComparisonProductCard
          imageUrl={item.product2?.image_url ?? null}
          name={product2Name}
          brand={item.product2?.brands ?? null}
          bestFitProfiles={item.product2BestFitProfiles}
          profileScoreChipContext={profileScoreChipContext}
        />
      </View>

      <View
        pointerEvents="none"
        className="absolute h-11 w-11 items-center justify-center rounded-full border border-neutrals-300 bg-white"
        style={{
          left: '50%',
          top: 68,
          marginLeft: -22,
          borderColor: COLORS.gray200,
        }}
      >
        <ArrowLeftRight color={COLORS.gray900} size={22} strokeWidth={1.75} />
      </View>
    </TouchableOpacity>
  );
}
