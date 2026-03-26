import type { ComponentProps } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    const iconColor = isFocused ? COLORS.primary : COLORS.gray400;

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
        style={styles.tab}
      >
        {options.tabBarIcon?.({ color: iconColor, size: 22, focused: isFocused })}
        <Text style={[styles.label, { color: iconColor }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const leftTabs = visibleRoutes.slice(0, 1);
  const rightTabs = visibleRoutes.slice(1);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {leftTabs.map(renderTab)}

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Scan"
        activeOpacity={0.7}
        onPress={() => {
          router.push('/scanner');
        }}
        style={styles.tabCenter}
      >
        <View style={styles.scannerCircle}>
          <ScanBarcode color={COLORS.white} size={26} />
        </View>
        <Text style={[styles.label, { color: COLORS.warning }]}>Scan</Text>
      </TouchableOpacity>

      {rightTabs.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    overflow: 'visible',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
    gap: 4,
  },
  tabCenter: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 4,
  },
  scannerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.warning,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    borderWidth: 4,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
