import type { ComponentProps } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { ScanBarcode } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

const HIDDEN_ROUTES = new Set(['index', 'tab-two']);

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
        className="flex-1 items-center pt-2.5 pb-1 gap-1"
      >
        {options.tabBarIcon?.({ color: iconColor, size: 22, focused: isFocused })}
        <Text className="text-sm font-semibold mt-0.5" style={{ color: iconColor }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const leftTabs = visibleRoutes.slice(0, 1);
  const rightTabs = visibleRoutes.slice(1);

  return (
    <View className="relative overflow-visible">
      {/* Shadow strip behind the tab bar */}
      <View
        className="absolute w-full bg-white z-[1]"
        style={{
          height: 30,
          top: -1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 8,
        }}
      />

      {/* Circle cutout behind the scanner button */}
      <View
        className="absolute bg-white z-[1]"
        style={{
          width: 90,
          height: 90,
          borderRadius: 45,
          top: -37,
          left: '50%',
          transform: [{ translateX: -45 }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 8,
        }}
      />

      {/* Tab bar content */}
      <View
        className="flex-row bg-white overflow-visible z-[2]"
        style={{ paddingBottom: insets.bottom }}
      >
        {leftTabs.map(renderTab)}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Scan"
          activeOpacity={0.7}
          onPress={() => {
            router.push('/scanner');
          }}
          className="flex-1 items-center pb-1"
        >
          <View
            className="items-center justify-center"
            style={{
              width: 66,
              height: 66,
              borderRadius: 33,
              backgroundColor: COLORS.accent,
              marginTop: -28,
            }}
          >
            <ScanBarcode color={COLORS.white} size={26} />
          </View>
          <Text className="text-sm font-semibold mt-0.5">Scan</Text>
        </TouchableOpacity>

        {rightTabs.map(renderTab)}
      </View>
    </View>
  );
}
