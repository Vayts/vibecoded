import type { ComparisonHistoryItem } from '@acme/shared';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { useComparisonsQuery } from '../../hooks/useComparisonsQuery';
import { useProfileScoreChipContext } from '../../hooks/useProfileScoreChipContext';
import { Button } from '../../../../shared/components/Button';
import { ComparisonHistoryRow } from '../ComparisonHistoryRow';
import { GitCompareArrows } from 'lucide-react-native';

interface ComparisonsListProps {
  onItemPress: (item: ComparisonHistoryItem) => void;
  searchQuery: string;
  enabled?: boolean;
}

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

export function ComparisonsList({
  onItemPress,
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
    refetch,
  } = useComparisonsQuery(searchQuery, enabled);
  const profileScoreChipContext = useProfileScoreChipContext();

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

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

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ComparisonHistoryRow
          item={item}
          onPress={onItemPress}
          profileScoreChipContext={profileScoreChipContext}
        />
      )}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void handleRefresh()}
          tintColor={COLORS.primary}
        />
      }
      ListFooterComponent={<ListFooter isFetchingNextPage={isFetchingNextPage} />}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      contentContainerStyle={
        items.length === 0
          ? { flex: 1 }
          : {
              paddingHorizontal: 12,
              paddingTop: 16,
              paddingBottom: 160,
            }
      }
    />
  );
}
