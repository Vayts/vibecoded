import type { ComparisonHistoryItem } from '@acme/shared';
import type { ScanHistoryItem } from '@acme/shared';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, Platform, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { SheetManager } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { ScanHistoryList } from '../ScanHistoryList';
import { FavouritesList } from '../FavouritesList';
import { ComparisonsList } from '../ComparisonsList';
import { DiscoverTabChips, type DiscoverTab } from '../DiscoverTabChips';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

const TABS: DiscoverTab[] = ['history', 'comparisons', 'favourites'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const TIMING_CONFIG = { duration: 250, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };
const IS_IOS = Platform.OS === 'ios';

export function ScansTabScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<DiscoverTab>('history');
  const activeIndexRef = useRef(0);
  const translateX = useSharedValue(0);

  const handleScanPress = useCallback((item: ScanHistoryItem) => {
    void SheetManager.show(SheetsEnum.ScannerResultSheet, {
      payload: { scanId: item.id },
    });
  }, []);

  const handleComparisonPress = useCallback((item: ComparisonHistoryItem) => {
    void SheetManager.show(SheetsEnum.ComparisonResultSheet, {
      payload: { comparisonId: item.id },
    });
  }, []);

  const handleTabSelect = useCallback(
    (tab: DiscoverTab) => {
      const index = TABS.indexOf(tab);
      if (index === -1 || index === activeIndexRef.current) return;
      activeIndexRef.current = index;
      if (IS_IOS) {
        setActiveTab(tab);
        translateX.value = withTiming(-index * SCREEN_WIDTH, TIMING_CONFIG);
      } else {
        setActiveTab(tab);
      }
    },
    [translateX],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const historyPanel = useMemo(
    () => <ScanHistoryList onScanPress={handleScanPress} />,
    [handleScanPress],
  );
  const favouritesPanel = useMemo(
    () => <FavouritesList onItemPress={handleScanPress} />,
    [handleScanPress],
  );
  const comparisonsPanel = useMemo(
    () => <ComparisonsList onItemPress={handleComparisonPress} />,
    [handleComparisonPress],
  );

  if (!IS_IOS) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="px-4">
          <Typography variant="pageTitle">Discover</Typography>
        </View> 
        <DiscoverTabChips selected={activeTab} onSelect={handleTabSelect} />
        <View
          style={{
            backgroundColor: COLORS.white,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 8,
            gap: 12,
            marginTop: 8,
            flex: 1,
          }}
        >
          <View
            style={{
              borderTopLeftRadius: 40,
              borderTopRightRadius: 40,
              overflow: "hidden",
              flex: 1,
            }}
          >
            {activeTab === 'history' && historyPanel}
            {activeTab === 'comparisons' && comparisonsPanel}
            {activeTab === 'favourites' && favouritesPanel}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-4">
        <Typography variant="pageTitle">Discover</Typography>
      </View>
      <DiscoverTabChips selected={activeTab} onSelect={handleTabSelect} />
        <View
          style={{
            backgroundColor: COLORS.white,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 8,
            gap: 12,
            marginTop: 8,
            flex: 1,
          }}
        >
          <View
            style={{
              borderTopLeftRadius: 40,
              borderTopRightRadius: 40,
              overflow: "hidden",
              flex: 1,
            }}
          >
            <View style={{ flex: 1, overflow: 'hidden' }}>
              <Animated.View
                style={[{ flexDirection: 'row', width: SCREEN_WIDTH * TABS.length }, animatedStyle]}
                className="flex-1"
              >
                <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
                  {historyPanel}
                </View>
                <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
                  {comparisonsPanel}
                </View>
                <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
                  {favouritesPanel}
                </View>
              </Animated.View>
            </View>
          </View>
        </View>
    </View>
  );
}
