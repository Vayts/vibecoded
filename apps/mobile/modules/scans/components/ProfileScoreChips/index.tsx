import type { ScanHistoryItem } from '@acme/shared';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { COLORS } from '../../../../shared/constants/colors';
import type { ProfileScoreChipContext } from '../../hooks/useProfileScoreChipContext';

type ProfileScoreChip = NonNullable<ScanHistoryItem['profileChips']>[number];

interface ProfileScoreChipsProps {
  chips: NonNullable<ScanHistoryItem['profileChips']>;
  context: ProfileScoreChipContext;
}

const getPrimaryLabel = (chip: ProfileScoreChip): string => {
  if (chip.profileId === 'you') return 'You';
  return chip.name.length > 10 ? `${chip.name.slice(0, 9)}…` : chip.name;
};

const getScoreTone = (score: number) => {
  if (score >= 70) {
    return {
      color: COLORS.primary900,
      backgroundColor: COLORS.successSoft,
      borderColor: COLORS.primary300,
    };
  }

  if (score >= 40) {
    return {
      color: COLORS.neutrals700,
      backgroundColor: COLORS.neutrals100,
      borderColor: COLORS.neutrals300,
    };
  }

  return {
    color: COLORS.danger,
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.dangerBorder,
  };
};

const getAvatarProps = (chip: ProfileScoreChip, context: ProfileScoreChipContext) => {
  if (chip.profileId === 'you') {
    return {
      imageUrl: context.currentUser?.avatarUrl ?? null,
      fallbackImageUrl: context.currentUser?.image ?? null,
    };
  }

  const familyMember = context.familyMembersById.get(chip.profileId);

  return {
    imageUrl: familyMember?.avatarUrl ?? null,
    fallbackImageUrl: null,
  };
};

export function ProfileScoreChips({ chips, context }: ProfileScoreChipsProps) {
  const primaryChip = chips.find((chip) => chip.profileId === 'you') ?? chips[0];
  const secondaryChips = chips.filter((chip) => chip.profileId !== primaryChip.profileId);
  const primaryTone = getScoreTone(primaryChip.score);
  const primaryAvatar = getAvatarProps(primaryChip, context);
  const primaryZIndex = secondaryChips.length + 2;

  return (
    <View className="flex-row items-center">
      <View
        className="flex-row items-center rounded-full pl-0.5 pr-2 py-0.5"
        style={{
          backgroundColor: primaryTone.backgroundColor,
          zIndex: primaryZIndex,
        }}
      >
        <UserAvatar
          imageUrl={primaryAvatar.imageUrl}
          fallbackImageUrl={primaryAvatar.fallbackImageUrl}
          name={primaryChip.name}
          size="xss"
          className="mr-1"
        />
        <Typography className="text-[13px] font-semibold" style={{ color: primaryTone.color }}>
          {getPrimaryLabel(primaryChip)}
        </Typography>
        <Typography className="ml-1 text-[13px] font-semibold" style={{ color: primaryTone.color }}>
          {primaryChip.score}
        </Typography>
      </View>

      {secondaryChips.length > 0 ? (
        <View className="flex-row items-center" style={{ marginLeft: -8 }}>
          {secondaryChips.map((chip, index) => {
            const tone = getScoreTone(chip.score);
            const avatar = getAvatarProps(chip, context);
            const chipZIndex = secondaryChips.length - index + 1;

            return (
              <View
                key={chip.profileId}
                className="items-center justify-center rounded-full bg-white"
                style={{
                  width: 24,
                  height: 24,
                  borderWidth: 2,
                  borderColor: tone.borderColor,
                  marginLeft: index === 0 ? 0 : -8,
                  zIndex: chipZIndex,
                }}
              >
                <UserAvatar
                  imageUrl={avatar.imageUrl}
                  fallbackImageUrl={avatar.fallbackImageUrl}
                  name={chip.name}
                  size="xss"
                />
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}