import type { ComparisonHistoryItem } from '@acme/shared';
import type { ScanHistoryItem } from '@acme/shared';
import React, { startTransition, useCallback, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { SheetManager } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenSheet } from '../../../../shared/components/ScreenSheet';
import { useDebounce } from '../../../../shared/hooks/useDebounce';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useOpenComparisonRoute } from '../../../scanner/hooks/useOpenComparisonRoute';
import { ScanHistoryList } from '../ScanHistoryList';
import { FavouritesList } from '../FavouritesList';
import { ComparisonsList } from '../ComparisonsList';
import { DiscoverTabChips, type DiscoverTab } from '../DiscoverTabChips';
import { ScansSearchInput } from '../ScansSearchInput';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Typography } from '../../../../shared/components/Typography';
import { useProfileScoreChipContext } from '../../hooks/useProfileScoreChipContext';
import { useToggleFavouriteMutation } from '../../hooks/useFavouritesQuery';

const TABS: DiscoverTab[] = ['history', 'comparisons', 'favourites'];
const TIMING_CONFIG = { duration: 250, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };

export function ScansTabScreen() {
  const insets = useSafeAreaInsets();
  const { openComparisonById, openComparisonByScanId } = useOpenComparisonRoute();
  const profileScoreChipContext = useProfileScoreChipContext();
  const { toggle } = useToggleFavouriteMutation();
  const [activeTab, setActiveTab] = useState<DiscoverTab>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const activeIndexRef = useRef(0);
  const activeIndex = useSharedValue(0);
  const debouncedSearchQuery = useDebounce(searchQuery.trim(), 300);

  const handleScanPress = useCallback(
    (item: ScanHistoryItem) => {
      if (item.type === 'comparison') {
        openComparisonByScanId(item.id);
        return;
      }

      const initialSnapIndex = item.product ? 1 : 0;

      void SheetManager.show(SheetsEnum.ScannerResultSheet, {
        snapIndex: initialSnapIndex,
        payload: {
          scanId: item.id,
          item,
          initialSnapIndex,
        },
      });
    },
    [openComparisonByScanId],
  );

  const handleComparisonPress = useCallback(
    (item: ComparisonHistoryItem) => {
      openComparisonById(item.id);
    },
    [openComparisonById],
  );

  const handleToggleFavourite = useCallback(
    (productId: string, currentlyFavourite: boolean) => {
      toggle(productId, currentlyFavourite);
    },
    [toggle],
  );

  const handleTabSelect = useCallback(
    (tab: DiscoverTab) => {
      const index = TABS.indexOf(tab);
      if (index === -1 || index === activeIndexRef.current) {
        return;
      }

      activeIndexRef.current = index;
      activeIndex.value = withTiming(index, TIMING_CONFIG);

      startTransition(() => {
        setActiveTab(tab);
      });
    },
    [activeIndex],
  );

  const activePanel = useMemo(() => {
    switch (activeTab) {
      case 'comparisons':
        return (
          <ComparisonsList
            onItemPress={handleComparisonPress}
            profileScoreChipContext={profileScoreChipContext}
            searchQuery={debouncedSearchQuery}
            enabled
          />
        );
      case 'favourites':
        return (
          <FavouritesList
            onItemPress={handleScanPress}
            onToggleFavourite={handleToggleFavourite}
            profileScoreChipContext={profileScoreChipContext}
            searchQuery={debouncedSearchQuery}
            enabled
          />
        );
      case 'history':
      default:
        return (
          <ScanHistoryList
            onScanPress={handleScanPress}
            onToggleFavourite={handleToggleFavourite}
            profileScoreChipContext={profileScoreChipContext}
            searchQuery={debouncedSearchQuery}
            enabled
          />
        );
    }
  }, [
    activeTab,
    debouncedSearchQuery,
    handleComparisonPress,
    handleScanPress,
    handleToggleFavourite,
    profileScoreChipContext,
  ]);

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
      <ScansSearchInput
        className="mx-4 mb-4 mt-2"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <KeyboardAvoidingView className="flex-1" behavior="padding" keyboardVerticalOffset={-80}>
        <Pressable className="flex-1" onPress={Keyboard.dismiss}>
          <ScreenSheet>{activePanel}</ScreenSheet>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}
