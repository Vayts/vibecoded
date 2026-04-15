import { ScrollView, TouchableOpacity, View } from 'react-native';
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
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {profiles.map((profile) => {
        const isSelected = profile.id === selectedProfileId;
        const backgroundColor = isSelected ? COLORS.successSoft : COLORS.neutrals100;
        const borderColor = isSelected ? COLORS.profileChipGoodBorder : COLORS.transparent;
        const textColor = isSelected ? COLORS.primary900 : COLORS.neutrals700;

        return (
          <TouchableOpacity
            key={profile.id}
            accessibilityRole="button"
            accessibilityLabel={`Show comparison for ${profile.name}`}
            activeOpacity={0.7}
            className="flex-row items-center rounded-lg px-2 py-1 pr-3"
            style={{
              backgroundColor,
              borderWidth: 1.5,
              borderColor,
            }}
            onPress={() => onSelect(profile.id)}
          >
            <UserAvatar
              imageUrl={profile.imageUrl}
              fallbackImageUrl={profile.fallbackImageUrl}
              name={profile.name}
              size="s"
            />
            <View className="ml-1 flex-row items-center gap-1 shrink">
              <Typography
                variant="buttonSmall"
                numberOfLines={1}
                style={{ color: textColor, flexShrink: 1, fontWeight: '600', fontSize: 13 }}
              >
                {profile.name}
              </Typography>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}