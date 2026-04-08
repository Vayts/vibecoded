import { Pressable, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

export type DiscoverTab = 'history' | 'favourites' | 'comparisons';

interface DiscoverTabChipsProps {
  selected: DiscoverTab;
  onSelect: (tab: DiscoverTab) => void;
}

const TABS: Array<{ key: DiscoverTab; label: string }> = [
  { key: 'history', label: 'All scans' },
  { key: 'comparisons', label: 'Comparison' },
  { key: 'favourites', label: 'Favourites' },
];

export function DiscoverTabChips({ selected, onSelect }: DiscoverTabChipsProps) {
  return (
    <View className="mt-2 bg-background relative mx-4 mb-2">
      <View className="h-0.5 w-full bg-neutral-200 absolute -bottom-[0] rounded-full"/>
      <View className="flex-row">
        {TABS.map((tab) => {
          const isSelected = tab.key === selected;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onSelect(tab.key)}
              accessibilityRole="button"
              accessibilityLabel={`${tab.label} tab`}
              accessibilityState={{ selected: isSelected }}
              className="flex-1 items-center pb-2 pt-3"
              style={{
                borderBottomWidth: 4,
                borderBottomColor: isSelected ? COLORS.primary : 'transparent',
                marginBottom: 0,
              }}
            >
              <Typography
                variant="sectionTitle"
                className="text-center font-bold"
                style={{ color: isSelected ? COLORS.primary : COLORS.gray400 }}
              >
                {tab.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
