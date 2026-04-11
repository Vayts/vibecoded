import { ScrollView, TouchableOpacity } from 'react-native';
import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface ComparisonProfileSelectorItem {
  id: string;
  name: string;
  imageUrl?: string | null;
  fallbackImageUrl?: string | null;
}

interface ComparisonProfileSelectorProps {
  profiles: ComparisonProfileSelectorItem[];
  selectedProfileId: string;
  onSelect: (profileId: string) => void;
}

export function ComparisonProfileSelector({
  profiles,
  selectedProfileId,
  onSelect,
}: ComparisonProfileSelectorProps) {
  if (profiles.length <= 1) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 2 }}
    >
      {profiles.map((profile) => {
        const isSelected = profile.id === selectedProfileId;

        return (
          <TouchableOpacity
            key={profile.id}
            accessibilityRole="button"
            accessibilityLabel={`Show comparison for ${profile.name}`}
            activeOpacity={0.75}
            className="flex-row items-center rounded-full border px-3 py-2"
            style={{
              backgroundColor: isSelected ? COLORS.primaryLight : COLORS.white,
              borderColor: isSelected ? COLORS.primary300 : COLORS.gray200,
            }}
            onPress={() => onSelect(profile.id)}
          >
            <UserAvatar
              imageUrl={profile.imageUrl}
              fallbackImageUrl={profile.fallbackImageUrl}
              name={profile.name}
              size="xs"
            />
            <Typography
              variant="buttonSmall"
              className="ml-2"
              style={{ color: isSelected ? COLORS.primary900 : COLORS.gray700 }}
            >
              {profile.name}
            </Typography>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}