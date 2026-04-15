import type { ScanHistoryItem } from '@acme/shared';
import type { ReactNode } from 'react';
import { memo, useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { ScanHistoryRow } from '../ScanHistoryRow';
import { useScanHistoryQuery } from '../../hooks/useScanHistoryQuery';
import type { ProfileScoreChipContext } from '../../hooks/useProfileScoreChipContext';
import { Button } from '../../../../shared/components/Button';
import ScanningArrow from '../../../../assets/scanning_arrow.svg';

interface ScanHistoryListProps {
  onScanPress: (item: ScanHistoryItem) => void;
  onToggleFavourite: (productId: string, currentlyFavourite: boolean) => void;
  profileScoreChipContext: ProfileScoreChipContext;
  searchQuery: string;
  enabled?: boolean;
  filterItem?: (item: ScanHistoryItem) => boolean;
  renderEmptyState?: (searchQuery: string) => ReactNode;
  contentPaddingBottom?: number;
}

const LIST_CONTENT_STYLE = {
  paddingBottom: 160,
  paddingTop: 16,
};

const HISTORY_ROW_HEIGHT = 98;

const EMPTY_CONTENT_STYLE = {
  flex: 1,
};

function EmptyState({ searchQuery }: { searchQuery: string }) {
  if (searchQuery) {
    return (
      <View className="flex-1 items-center justify-center px-8 py-20">
        <Typography variant="sectionTitle" className="text-center">
          No scans found
        </Typography>
        <Typography variant="bodySecondary" className="mt-2 text-center">
          Try a different product name or brand.
        </Typography>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center px-8 mt-16">
      
      <View
        className="w-24 h-24 rounded-md bg-gray-100 mb-6"
      />

      <Typography variant="hero" className="text-center">
        Start scanning your products
      </Typography>
      <Typography className="text-center mt-4 px-4">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      </Typography>
      <View className="mb-4">
        <ScanningArrow width={80} height={160} />
      </View>
    </View>
  );
}

function ListFooter({ isFetchingNextPage }: { isFetchingNextPage: boolean }) {
  if (!isFetchingNextPage) return null;
  return (
    <View className="py-4 items-center">
      <ActivityIndicator color={COLORS.primary} />
    </View>
  );
}

export const ScanHistoryList = memo(function ScanHistoryList({
  onScanPress,
  onToggleFavourite,
  profileScoreChipContext,
  searchQuery,
  enabled = true,
  filterItem,
  renderEmptyState,
  contentPaddingBottom = 160,
}: ScanHistoryListProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
    refetch,
  } = useScanHistoryQuery(searchQuery, enabled);

  const items = useMemo(
    () =>
      (data?.pages.flatMap((page) => page.items) ?? []).filter((item) =>
        filterItem ? filterItem(item) : true,
      ),
    [data?.pages, filterItem],
  );

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: ScanHistoryItem }) => (
      <ScanHistoryRow
        item={item}
        onPress={onScanPress}
        onToggleFavourite={onToggleFavourite}
        profileScoreChipContext={profileScoreChipContext}
      />
    ),
    [onScanPress, onToggleFavourite, profileScoreChipContext],
  );

  const keyExtractor = useCallback((item: ScanHistoryItem) => item.id, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<ScanHistoryItem> | null | undefined, index: number) => ({
      length: HISTORY_ROW_HEIGHT,
      offset: HISTORY_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const contentContainerStyle = useMemo(
    () =>
      items.length === 0
        ? EMPTY_CONTENT_STYLE
        : {
            ...LIST_CONTENT_STYLE,
            paddingBottom: contentPaddingBottom,
          },
    [contentPaddingBottom, items.length],
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Typography variant="sectionTitle" className="text-center">
          Something went wrong
        </Typography>
        <Typography variant="bodySecondary" className="mt-2 text-center">
          {error?.message ?? 'Failed to load scan history'}
        </Typography>
        <View className="mt-4">
          <Button label="Retry" onPress={() => void refetch()} />
        </View>
      </View>
    );
  }

  if (items.length === 0) {
    return renderEmptyState ? <>{renderEmptyState(searchQuery)}</> : <EmptyState searchQuery={searchQuery} />;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      automaticallyAdjustContentInsets={false}
      contentInsetAdjustmentBehavior="never"
      removeClippedSubviews
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={5}
      updateCellsBatchingPeriod={50}
      getItemLayout={getItemLayout}
      keyboardShouldPersistTaps="handled"
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={() => void handleRefresh()}
          tintColor={COLORS.primary}
        />
      }
      ListFooterComponent={<ListFooter isFetchingNextPage={isFetchingNextPage} />}
      contentContainerStyle={contentContainerStyle}
    />
  );
});