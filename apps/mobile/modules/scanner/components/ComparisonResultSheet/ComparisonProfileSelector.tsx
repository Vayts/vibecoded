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
  if (profiles.length === 0) {
    return null;
  }

  return (
    <View className="px-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10 }}
      >
        {profiles.map((profile) => {
          const isSelected = profile.id === selectedProfileId;
          const borderColor = isSelected ? COLORS.profileChipGoodBorder : 'transparent';
          const textColor = isSelected ? COLORS.primary900 : COLORS.neutrals700;

          return (
            <TouchableOpacity
              key={profile.id}
              accessibilityRole="button"
              accessibilityLabel={`Show comparison for ${profile.name}`}
              activeOpacity={0.7}
              className="flex-row items-center bg-neutrals-50 rounded-[6px] px-3 py-1 pr-4"
              style={{
                borderWidth: 1.5,
                borderColor,
              }}
              disabled={profiles.length === 1}
              onPress={() => onSelect(profile.id)}
            >
              <UserAvatar
                imageUrl={profile.imageUrl}
                fallbackImageUrl={profile.fallbackImageUrl}
                name={profile.name}
                size="s"
              />
              <View className="ml-2 shrink">
                <Typography
                  variant="buttonSmall"
                  numberOfLines={1}
                  style={{ color: textColor, flexShrink: 1, fontWeight: '600' }}
                >
                  {profile.name}
                </Typography>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}