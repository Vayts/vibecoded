import type { ProfileComparisonResult } from '@acme/shared';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface ProfileChipsProps {
  profiles: ProfileComparisonResult[];
  selectedProfileId: string;
  onSelect: (profileId: string) => void;
}

export function ProfileChips({ profiles, selectedProfileId, onSelect }: ProfileChipsProps) {
  if (profiles.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-4"
      contentContainerStyle={{ gap: 8 }}
    >
      {profiles.map((profile) => {
        const isSelected = profile.profileId === selectedProfileId;

        return (
          <TouchableOpacity
            key={profile.profileId}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${profile.profileName} comparison`}
            className="min-h-[44px] flex-row items-center rounded-full border px-4 py-2"
            style={{
              borderColor: isSelected ? COLORS.primary : COLORS.gray200,
              backgroundColor: isSelected ? COLORS.primaryLight : COLORS.white,
            }}
            onPress={() => onSelect(profile.profileId)}
          >
            <Typography
              variant="buttonSmall"
              style={{ color: isSelected ? COLORS.primary : COLORS.gray700 }}
            >
              {profile.profileName}
            </Typography>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
