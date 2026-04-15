import type { ComparisonHistoryItem } from '@acme/shared';
import { memo, useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { useComparisonsQuery } from '../../hooks/useComparisonsQuery';
import type { ProfileScoreChipContext } from '../../hooks/useProfileScoreChipContext';
import { Button } from '../../../../shared/components/Button';
import { ComparisonHistoryRow } from '../ComparisonHistoryRow';
import { GitCompareArrows } from 'lucide-react-native';

interface ComparisonsListProps {
  onItemPress: (item: ComparisonHistoryItem) => void;
  profileScoreChipContext: ProfileScoreChipContext;
  searchQuery: string;
  enabled?: boolean;
}

const EMPTY_CONTENT_STYLE = {
  flex: 1,
};

const LIST_CONTENT_STYLE = {
  paddingHorizontal: 12,
  paddingTop: 16,
  paddingBottom: 160,
};

function EmptyState({ searchQuery }: { searchQuery: string }) {
  if (searchQuery) {
    return (
      <View className="flex-1 items-center justify-center px-8 py-20">
        <Typography variant="sectionTitle" className="text-center">
          No comparisons found
        </Typography>
        <Typography variant="bodySecondary" className="mt-2 text-center">
          Try a different product name or brand.
        </Typography>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-blue-50">
        <GitCompareArrows color={COLORS.primary} size={28} />
      </View>
      <Typography variant="sectionTitle" className="text-center">
        No comparisons yet
      </Typography>
      <Typography variant="bodySecondary" className="mt-2 text-center">
        Compare two products to see which one is better for you.
      </Typography>
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

export const ComparisonsList = memo(function ComparisonsList({
  onItemPress,
  profileScoreChipContext,
  searchQuery,
  enabled = true,
}: ComparisonsListProps) {
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
  } = useComparisonsQuery(searchQuery, enabled);

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
    ({ item }: { item: ComparisonHistoryItem }) => (
      <ComparisonHistoryRow
        item={item}
        onPress={onItemPress}
        profileScoreChipContext={profileScoreChipContext}
      />
    ),
    [onItemPress, profileScoreChipContext],
  );

  const keyExtractor = useCallback((item: ComparisonHistoryItem) => item.id, []);

  const renderSeparator = useCallback(() => <View style={{ height: 12 }} />, []);

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
          {error?.message ?? 'Failed to load comparisons'}
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
      initialNumToRender={4}
      maxToRenderPerBatch={4}
      windowSize={5}
      updateCellsBatchingPeriod={50}
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
      ItemSeparatorComponent={renderSeparator}
      contentContainerStyle={contentContainerStyle}
    />
  );
});
