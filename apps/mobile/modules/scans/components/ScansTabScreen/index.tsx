import type { ComparisonHistoryItem } from '@acme/shared';
import type { ScanHistoryItem } from '@acme/shared';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { SheetManager } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebounce } from '../../../../shared/hooks/useDebounce';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { ScanHistoryList } from '../ScanHistoryList';
import { FavouritesList } from '../FavouritesList';
import { ComparisonsList } from '../ComparisonsList';
import { DiscoverTabChips, type DiscoverTab } from '../DiscoverTabChips';
import { ScansSearchInput } from '../ScansSearchInput';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

const TABS: DiscoverTab[] = ['history', 'comparisons', 'favourites'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const TIMING_CONFIG = { duration: 250, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };
const IS_IOS = Platform.OS === 'ios';

export function ScansTabScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<DiscoverTab>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const activeIndexRef = useRef(0);
  const activeIndex = useSharedValue(0);
  const debouncedSearchQuery = useDebounce(searchQuery.trim(), 300);

  const commitActiveTab = useCallback((tab: DiscoverTab, index: number) => {
    if (activeIndexRef.current !== index) {
      return;
    }

    setActiveTab(tab);
  }, []);

  const handleScanPress = useCallback((item: ScanHistoryItem) => {
    void SheetManager.show(SheetsEnum.ScannerResultSheet, {
      payload: { 
        scanId: item.id,
        item: item,
      },
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
        activeIndex.value = withTiming(index, TIMING_CONFIG, (finished) => {
          if (finished) {
            runOnJS(commitActiveTab)(tab, index);
          }
        });

        return;
      }

      activeIndex.value = withTiming(index, TIMING_CONFIG);

      setActiveTab(tab);
    },
    [activeIndex, commitActiveTab],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -activeIndex.value * SCREEN_WIDTH }],
  }));

  const historyPanel = useMemo(
    () => (
      <ScanHistoryList
        onScanPress={handleScanPress}
        searchQuery={debouncedSearchQuery}
        enabled={activeTab === 'history'}
      />
    ),
    [activeTab, debouncedSearchQuery, handleScanPress],
  );
  const favouritesPanel = useMemo(
    () => (
      <FavouritesList
        onItemPress={handleScanPress}
        searchQuery={debouncedSearchQuery}
        enabled={activeTab === 'favourites'}
      />
    ),
    [activeTab, debouncedSearchQuery, handleScanPress],
  );
  const comparisonsPanel = useMemo(
    () => (
      <ComparisonsList
        onItemPress={handleComparisonPress}
        searchQuery={debouncedSearchQuery}
        enabled={activeTab === 'comparisons'}
      />
    ),
    [activeTab, debouncedSearchQuery, handleComparisonPress],
  );

  if (!IS_IOS) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="px-4">
          <Typography variant="pageTitle">Discover</Typography>
        </View> 
        <DiscoverTabChips
          selected={activeTab}
          selectedIndex={activeIndex}
          onSelect={handleTabSelect}
        />
        <ScansSearchInput className="mx-4 mt-4" value={searchQuery} onChangeText={setSearchQuery} />
          <KeyboardAvoidingView className="flex-1" behavior="padding" keyboardVerticalOffset={-80}>
            <Pressable className="flex-1 h-full" onPress={Keyboard.dismiss}>
            <View
              style={{
                backgroundColor: COLORS.white,
                borderTopRightRadius: 16,
                borderTopLeftRadius: 16,
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
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  overflow: 'hidden',
                  flex: 1,
                }}
              >
                {activeTab === 'history' && historyPanel}
                {activeTab === 'comparisons' && comparisonsPanel}
                {activeTab === 'favourites' && favouritesPanel}
              </View>
            </View>
            </Pressable>
          </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-4">
        <Typography variant="pageTitle">Discover</Typography>
      </View>

      <DiscoverTabChips
        selected={activeTab}
        selectedIndex={activeIndex}
        onSelect={handleTabSelect}
      />

      <ScansSearchInput className="mx-4 mb-4 mt-2" value={searchQuery} onChangeText={setSearchQuery} />
      
        <KeyboardAvoidingView className="flex-1" behavior="padding" keyboardVerticalOffset={-80}>
          <Pressable className="flex-1" onPress={Keyboard.dismiss}>
          <View
            style={{
              backgroundColor: COLORS.white,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 8,
              gap: 12,
              marginTop: 8,
              flex: 1,
            }}
          >
            <View
              style={{
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                overflow: 'hidden',
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
            </Pressable>
        </KeyboardAvoidingView>
    </View>
  );
}
