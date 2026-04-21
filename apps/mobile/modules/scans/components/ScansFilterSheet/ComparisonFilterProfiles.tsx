import { TouchableOpacity, View } from 'react-native';
import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import type { ScansFilterProfileOption } from '../../types/filters';
import { SelectionIndicator } from './filterSheetOptions';

interface ComparisonFilterProfilesProps {
  profiles: ScansFilterProfileOption[];
  selectedProfileIds: string[];
  onToggleProfile: (profileId: string) => void;
}

export function ComparisonFilterProfiles({
  profiles,
  selectedProfileIds,
  onToggleProfile,
}: ComparisonFilterProfilesProps) {
  return (
    <View className="mt-3 gap-1">
      {profiles.map((profile) => {
        const isSelected = selectedProfileIds.includes(profile.id);

        return (
          <TouchableOpacity
            key={profile.id}
            accessibilityRole="button"
            accessibilityLabel={`Toggle ${profile.name} comparison filter`}
            activeOpacity={0.7}
            className="flex-row items-center justify-between rounded-2xl px-1 py-1"
            onPress={() => onToggleProfile(profile.id)}
          >
            <View className="flex-row items-center gap-3">
              <UserAvatar
                imageUrl={profile.avatarUrl}
                fallbackImageUrl={profile.fallbackImageUrl}
                name={profile.name}
                size="xs"
              />
              <View className="shrink">
                <Typography style={{ color: isSelected ? COLORS.primary900 : COLORS.neutrals700 }}>
                  {profile.name}
                </Typography>
              </View>
            </View>
            <SelectionIndicator selected={isSelected} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}


