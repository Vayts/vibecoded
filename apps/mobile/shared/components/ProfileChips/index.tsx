import { ScrollView, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { Typography } from '../Typography';
import { UserAvatar } from '../UserAvatar';

export interface ProfileChipItem {
  id: string;
  name: string;
  score?: number;
  imageUrl?: string | null;
  fallbackImageUrl?: string | null;
}

interface ProfileChipsProps {
  profiles: ProfileChipItem[];
  selectedProfileId: string;
  onSelect: (profileId: string) => void;
  className?: string;
}

export function ProfileChips({
  profiles,
  selectedProfileId,
  onSelect,
  className,
}: ProfileChipsProps) {
  if (profiles.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={className}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {profiles.map((profile) => {
        const isSelected = profile.id === selectedProfileId;

        return (
          <TouchableOpacity
            key={profile.id}
            accessibilityRole="button"
            accessibilityLabel={
              profile.score !== undefined
                ? `${profile.name}: ${profile.score}/100`
                : `${profile.name}`
            }
            className="flex-row items-center rounded-full border px-4 py-2"
            style={{
              borderColor: isSelected ? COLORS.primary : COLORS.gray200,
              backgroundColor: isSelected ? COLORS.primaryLight : COLORS.white,
            }}
            onPress={() => onSelect(profile.id)}
          >
            <UserAvatar
              imageUrl={profile.imageUrl}
              fallbackImageUrl={profile.fallbackImageUrl}
              name={profile.name}
              size="sm"
              className="mr-2"
            />
            <Typography
              variant="buttonSmall"
              style={{ color: isSelected ? COLORS.primary : COLORS.gray700 }}
            >
              {profile.name}
            </Typography>
            {profile.score !== undefined ? (
              <View
                className="ml-2 rounded-full px-2 py-0.5"
                style={{ backgroundColor: isSelected ? COLORS.primary : COLORS.gray200 }}
              >
                <Typography
                  variant="caption"
                  className="font-semibold"
                  style={{ color: isSelected ? COLORS.white : COLORS.gray700 }}
                >
                  {profile.score}
                </Typography>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
