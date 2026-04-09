import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { COLORS } from '../../../../shared/constants/colors';

export interface ProfileScoreSelectorItem {
  id: string;
  name: string;
  score?: number;
  imageUrl?: string | null;
  fallbackImageUrl?: string | null;
}

interface ProfileScoreSelectorProps {
  profiles: ProfileScoreSelectorItem[];
  selectedProfileId: string;
  onSelect: (profileId: string) => void;
  className?: string;
}

type SelectorTone = 'good' | 'neutral' | 'bad';

const SELECTOR_TONES = {
  good: {
    backgroundColor: COLORS.successSoft,
    borderColor: COLORS.profileChipGoodBorder,
    textColor: COLORS.primary900,
  },
  neutral: {
    backgroundColor: COLORS.neutrals100,
    borderColor: COLORS.profileChipNeutralBorder,
    textColor: COLORS.neutrals700,
  },
  bad: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.profileChipBadBorder,
    textColor: COLORS.danger,
  },
} as const;

const getSelectorTone = (score?: number): SelectorTone => {
  if (score == null) {
    return 'neutral';
  }

  if (score >= 70) {
    return 'good';
  }

  if (score >= 40) {
    return 'neutral';
  }

  return 'bad';
};

export function ProfileScoreSelector({
  profiles,
  selectedProfileId,
  onSelect,
  className,
}: ProfileScoreSelectorProps) {
  if (profiles.length <= 1) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={className}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {profiles.map((profile) => {
        const tone = SELECTOR_TONES[getSelectorTone(profile.score)];
        const isSelected = profile.id === selectedProfileId;

        return (
          <TouchableOpacity
            key={profile.id}
            accessibilityRole="button"
            accessibilityLabel={
              profile.score !== undefined
                ? `${profile.name}: ${profile.score}/100`
                : profile.name
            }
            activeOpacity={0.7}
            className="flex-row items-center rounded-lg px-2 py-0.5"
            style={{
              backgroundColor: tone.backgroundColor,
              borderWidth: 1.5,
              borderColor: isSelected ? tone.borderColor : COLORS.transparent,
            }}
            onPress={() => onSelect(profile.id)}
          >
            <UserAvatar
              imageUrl={profile.imageUrl}
              fallbackImageUrl={profile.fallbackImageUrl}
              name={profile.name}
              size="xs"
            />
            <View className="ml-1 flex-row gap-1 items-center shrink">
              <Typography
                variant="buttonSmall"
                numberOfLines={1}
                style={{ color: tone.textColor, flexShrink: 1, fontWeight: '600', fontSize: 13 }}
              >
                {profile.name}
              </Typography>
              {profile.score != null ? (
                <Typography
                  variant="button"
                  numberOfLines={1}
                  style={{ color: tone.textColor, fontWeight: '700', fontSize: 13 }}
                >
                  {profile.score}
                </Typography>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}