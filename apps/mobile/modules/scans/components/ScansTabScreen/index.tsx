import type { ComparisonHistoryItem } from '@acme/shared';
import type { ScanHistoryItem } from '@acme/shared';
import { ListFilter } from 'lucide-react-native';
import React, { startTransition, useCallback, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, TouchableOpacity, View } from 'react-native';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { SheetManager } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenSheet } from '../../../../shared/components/ScreenSheet';
import { useDebounce } from '../../../../shared/hooks/useDebounce';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { COLORS } from '../../../../shared/constants/colors';
import { useOpenComparisonRoute } from '../../../scanner/hooks/useOpenComparisonRoute';
import { ScanHistoryList } from '../ScanHistoryList';
import { FavouritesList } from '../FavouritesList';
import { ComparisonsList } from '../ComparisonsList';
import { DiscoverTabChips, type DiscoverTab } from '../DiscoverTabChips';
import { ScansSearchInput } from '../ScansSearchInput';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Typography } from '../../../../shared/components/Typography';
import { useProfileScoreChipContext } from '../../hooks/useProfileScoreChipContext';
import { useScansTabFilters } from '../../hooks/useScansTabFilters';
import { useToggleFavouriteMutation } from '../../hooks/useFavouritesQuery';

const TABS: DiscoverTab[] = ['history', 'comparisons', 'favourites'];
const TIMING_CONFIG = { duration: 250, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };

export function ScansTabScreen() {
  const insets = useSafeAreaInsets();
  const { openComparisonById, openComparisonByScanId } = useOpenComparisonRoute();
  const profileScoreChipContext = useProfileScoreChipContext();
  const { toggle } = useToggleFavouriteMutation();
  const [activeTab, setActiveTab] = useState<DiscoverTab>('history');
  const [historyResultsCount, setHistoryResultsCount] = useState(0);
  const [favouritesResultsCount, setFavouritesResultsCount] = useState(0);
  const [comparisonResultsCount, setComparisonResultsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const activeIndexRef = useRef(0);
  const activeIndex = useSharedValue(0);
  const debouncedSearchQuery = useDebounce(searchQuery.trim(), 300);
  const activeResultCount =
    activeTab === 'comparisons'
      ? comparisonResultsCount
      : activeTab === 'favourites'
        ? favouritesResultsCount
        : historyResultsCount;
  const { activeFilterCount, comparisonQueryFilters, handleOpenFilters, sharedQueryFilters } =
    useScansTabFilters(activeTab, activeResultCount);

  const handleScanPress = useCallback(
    (item: ScanHistoryItem) => {
      if (item.type === 'comparison') {
        openComparisonByScanId(item.id);
        return;
      }

      void SheetManager.show(SheetsEnum.ScannerResultSheet, {
        payload: {
          scanId: item.id,
          item,
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
            filters={comparisonQueryFilters}
            onTotalCountChange={setComparisonResultsCount}
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
            filters={sharedQueryFilters}
            onTotalCountChange={setFavouritesResultsCount}
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
            filters={sharedQueryFilters}
            onTotalCountChange={setHistoryResultsCount}
          />
        );
    }
  }, [
    activeTab,
    comparisonQueryFilters,
    debouncedSearchQuery,
    handleComparisonPress,
    handleScanPress,
    handleToggleFavourite,
    profileScoreChipContext,
    sharedQueryFilters,
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
      <View className="mx-4 mb-4 mt-2 flex-row items-center gap-3">
        <View className="flex-1">
          <ScansSearchInput value={searchQuery} onChangeText={setSearchQuery} />
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open scan filters"
          activeOpacity={0.7}
          className={`h-11 w-11 items-center justify-center rounded-full ${activeFilterCount > 0 ? 'bg-primary-900' : 'bg-transparent'}`}
          onPress={handleOpenFilters}
        >
          <ListFilter
            color={activeFilterCount > 0 ? COLORS.white : COLORS.gray700}
            size={20}
            strokeWidth={2}
          />
          {activeFilterCount > 0 ? (
            <View className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-white px-1 py-0.5">
              <Typography variant="caption" className="text-center font-semibold text-primary-900">
                {activeFilterCount}
              </Typography>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView className="flex-1" behavior="padding" keyboardVerticalOffset={-80}>
        <Pressable className="flex-1" onPress={Keyboard.dismiss}>
          <ScreenSheet>{activePanel}</ScreenSheet>
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}
