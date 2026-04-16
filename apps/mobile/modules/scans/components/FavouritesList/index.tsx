import type { ScanHistoryItem } from '@acme/shared';
import { memo, useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { ScanHistoryRow } from '../ScanHistoryRow';
import { useFavouritesQuery } from '../../hooks/useFavouritesQuery';
import type { ProfileScoreChipContext } from '../../hooks/useProfileScoreChipContext';
import { Button } from '../../../../shared/components/Button';
import { CustomLoader } from '../../../../shared/components/CustomLoader';

interface FavouritesListProps {
  onItemPress: (item: ScanHistoryItem) => void;
  onToggleFavourite: (productId: string, currentlyFavourite: boolean) => void;
  profileScoreChipContext: ProfileScoreChipContext;
  searchQuery: string;
  enabled?: boolean;
}

const LIST_CONTENT_STYLE = {
  paddingBottom: 160,
  paddingTop: 16,
};

const FAVOURITE_ROW_HEIGHT = 98;

const EMPTY_CONTENT_STYLE = {
  flex: 1,
};

function EmptyState({ searchQuery }: { searchQuery: string }) {
  if (searchQuery) {
    return (
      <View className="flex-1 items-center justify-center pb-[140px] px-8 py-4">
        <Typography variant="sectionTitle" className="text-center">
          No favourites found
        </Typography>
        <Typography variant="bodySecondary" className="mt-2 text-center">
          Try a different product name or brand.
        </Typography>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center pb-[140px] px-8">
      <View
        className="w-24 h-24 rounded-md bg-gray-100 mb-6"
      />

      <Typography variant="hero" className="text-center">
        No favourite products yet
      </Typography>
      <Typography className="text-center mt-4 px-4">
        Start adding products to favourites to keep track of the ones you like most.
      </Typography>

    </View>
  );
}

function ListFooter({ isFetchingNextPage }: { isFetchingNextPage: boolean }) {
  if (!isFetchingNextPage) return null;
  return (
    <View className="py-4 items-center">
      <CustomLoader isReversed size="sm" />
    </View>
  );
}

export const FavouritesList = memo(function FavouritesList({
  onItemPress,
  onToggleFavourite,
  profileScoreChipContext,
  searchQuery,
  enabled = true,
}: FavouritesListProps) {
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
  } = useFavouritesQuery(searchQuery, enabled);

  const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data?.pages]);

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
        onPress={onItemPress}
        onToggleFavourite={onToggleFavourite}
        profileScoreChipContext={profileScoreChipContext}
      />
    ),
    [onItemPress, onToggleFavourite, profileScoreChipContext],
  );

  const keyExtractor = useCallback((item: ScanHistoryItem) => item.id, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<ScanHistoryItem> | null | undefined, index: number) => ({
      length: FAVOURITE_ROW_HEIGHT,
      offset: FAVOURITE_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const contentContainerStyle = useMemo(
    () => (items.length === 0 ? EMPTY_CONTENT_STYLE : LIST_CONTENT_STYLE),
    [items.length],
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
          {error?.message ?? 'Failed to load favourites'}
        </Typography>
        <View className="mt-4">
          <Button label="Retry" onPress={() => void refetch()} />
        </View>
      </View>
    );
  }

  if (items.length === 0) {
    return <EmptyState searchQuery={searchQuery} />;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
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
