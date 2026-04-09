import type { ComponentProps } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { ScanBarcode } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

const HIDDEN_ROUTES = new Set(['index', 'tab-two']);
const FLOATING_GAP = 8;
const TAB_BAR_SIDE_INSET = 14;
const TAB_BAR_HEIGHT = 80;

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const floatingBottom = insets.bottom + FLOATING_GAP;

  const visibleRoutes = state.routes.filter((route) => !HIDDEN_ROUTES.has(route.name));

  const renderTab = (route: TabBarProps['state']['routes'][number]) => {
    const { options } = descriptors[route.key];
    const label = typeof options.title === 'string' ? options.title : route.name;
    const realIndex = state.routes.indexOf(route);
    const isFocused = state.index === realIndex;
    const iconColor = isFocused ? COLORS.primary : COLORS.neutrals900;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
        activeOpacity={0.7}
        onPress={onPress}
        className="flex-1 h-full items-center pt-1 pb-1 gap-1"
      >
        <View className={`${isFocused ? 'bg-neutrals-200' : 'bg-transparent'} rounded-xl px-5 py-1.5`}>
          {options.tabBarIcon?.({ color: iconColor, size: 22, focused: isFocused })}
        </View>
        <Text className="text-sm font-semibold mt-0.5" style={{ color: iconColor }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const leftTabs = visibleRoutes.slice(0, 1);
  const rightTabs = visibleRoutes.slice(1);

  return (
    <View
      pointerEvents="box-none"
      className="absolute overflow-visible"
      style={{
        left: TAB_BAR_SIDE_INSET,
        right: TAB_BAR_SIDE_INSET,
        bottom: floatingBottom,
        zIndex: 100,
      }}
    >
      <View
        className="flex-row items-end rounded-[14px] bg-neutrals-50 border-neutrals-100 border px-3 pb-2 pt-3 overflow-visible"
        style={{
          minHeight: TAB_BAR_HEIGHT,
        }}
      >
        {leftTabs.map(renderTab)}

        <View className="w-[33%] h-full">
          <View
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-neutrals-50 border-neutrals-100 border w-12 h-12 rounded-full"
            style={{
              top: -34.5,
              width: 69,
              height: 69,
            }}
          />
          <View
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-neutrals-50 w-12 h-12"
            style={{
              top: -11,
              width: 69,
              height: 69,
            }}
          />

          <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Scan"
          activeOpacity={0.7}
          onPress={() => {
            router.push('/scanner');
          }}
          className="flex-1 items-center justify-end pb-1"
        >
          <View
            className="w-[52px] h-[52px] rounded-[26px] -top-6 absolute items-center justify-center bg-accent-600"
          >
            <ScanBarcode color={COLORS.white} size={26} />
          </View>

          <Text className="text-sm relativeg font-semibold -mt-10" style={{ color: COLORS.neutrals900 }}>
            Scan
          </Text>
        </TouchableOpacity>
        </View>

        {rightTabs.map(renderTab)}
      </View>
    </View>
  );
}
