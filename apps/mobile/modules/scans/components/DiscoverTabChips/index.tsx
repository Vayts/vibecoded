import { Pressable, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

export type DiscoverTab = 'history' | 'favourites';

interface DiscoverTabChipsProps {
  selected: DiscoverTab;
  onSelect: (tab: DiscoverTab) => void;
}

const TABS: Array<{ key: DiscoverTab; label: string }> = [
  { key: 'history', label: 'History' },
  { key: 'favourites', label: 'Favourites' },
];

export function DiscoverTabChips({ selected, onSelect }: DiscoverTabChipsProps) {
  return (
    <View className="flex-row gap-2 px-4 pb-3">
      {TABS.map((tab) => {
        const isSelected = tab.key === selected;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            accessibilityRole="button"
            accessibilityLabel={`${tab.label} tab`}
            className="rounded-full px-4 py-4"
            style={{
              backgroundColor: isSelected ? COLORS.primary : COLORS.neutrals200,
            }}
          >
            <Typography
              variant="buttonSmall"
              style={{ color: isSelected ? COLORS.white : COLORS.gray700 }}
            >
              {tab.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}
