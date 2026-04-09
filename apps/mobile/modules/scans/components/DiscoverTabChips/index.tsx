import { Pressable, View } from 'react-native';
import Animated, {
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { COLORS } from '../../../../shared/constants/colors';

export type DiscoverTab = 'history' | 'favourites' | 'comparisons';

interface DiscoverTabChipsProps {
  selected: DiscoverTab;
  selectedIndex: SharedValue<number>;
  onSelect: (tab: DiscoverTab) => void;
}

const TABS: Array<{ key: DiscoverTab; label: string }> = [
  { key: 'history', label: 'All scans' },
  { key: 'comparisons', label: 'Comparison' },
  { key: 'favourites', label: 'Favourites' },
];

const TAB_INDICES = TABS.map((_, index) => index);
const LABEL_COLORS = TABS.map((_, selectedTabIndex) =>
  TABS.map((__, tabIndex) => (tabIndex === selectedTabIndex ? COLORS.primary : COLORS.gray400)),
);
const INDICATOR_COLORS = TABS.map((_, selectedTabIndex) =>
  TABS.map((__, tabIndex) => (tabIndex === selectedTabIndex ? COLORS.primary : 'transparent')),
);

interface DiscoverTabChipProps {
  index: number;
  isSelected: boolean;
  selectedIndex: SharedValue<number>;
  tab: (typeof TABS)[number];
  onSelect: (tab: DiscoverTab) => void;
}

function DiscoverTabChip({
  index,
  isSelected,
  selectedIndex,
  tab,
  onSelect,
}: DiscoverTabChipProps) {
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(selectedIndex.value, TAB_INDICES, LABEL_COLORS[index]),
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(selectedIndex.value, TAB_INDICES, INDICATOR_COLORS[index]),
  }));

  const handleSelect = () => {
    onSelect(tab.key);
  };

  return (
    <Pressable
      onPressIn={handleSelect}
      onPress={handleSelect}
      accessibilityRole="button"
      accessibilityLabel={`${tab.label} tab`}
      accessibilityState={{ selected: isSelected }}
      className="relative flex-1 items-center pb-2 pt-3"
    >
      <Animated.Text
        style={[
          labelStyle,
          {
            fontSize: 16,
            fontWeight: '700',
            lineHeight: 28,
            textAlign: 'center',
          },
        ]}
      >
        {tab.label}
      </Animated.Text>
      <Animated.View
        pointerEvents="none"
        className="absolute bottom-0 left-0 right-0 h-1 rounded-full"
        style={indicatorStyle}
      />
    </Pressable>
  );
}

export function DiscoverTabChips({ selected, selectedIndex, onSelect }: DiscoverTabChipsProps) {
  return (
    <View className="mt-2 bg-background relative mx-4 mb-2">
      <View className="h-0.5 w-full bg-neutral-200 absolute -bottom-[0] rounded-full" />
      <View className="flex-row">
        {TABS.map((tab, index) => (
          <DiscoverTabChip
            key={tab.key}
            index={index}
            isSelected={tab.key === selected}
            selectedIndex={selectedIndex}
            tab={tab}
            onSelect={onSelect}
          />
        ))}
      </View>
    </View>
  );
}
