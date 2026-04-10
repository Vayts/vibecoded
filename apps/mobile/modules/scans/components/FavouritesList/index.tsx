import type { ScanHistoryItem } from '@acme/shared';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { ScanHistoryRow } from '../ScanHistoryRow';
import { useFavouritesQuery } from '../../hooks/useFavouritesQuery';
import { useProfileScoreChipContext } from '../../hooks/useProfileScoreChipContext';
import { Button } from '../../../../shared/components/Button';
import { Heart } from 'lucide-react-native';
import { CustomLoader } from '../../../../shared/components/CustomLoader';

interface FavouritesListProps {
  onItemPress: (item: ScanHistoryItem) => void;
  searchQuery: string;
  enabled?: boolean;
}

function EmptyState({ searchQuery }: { searchQuery: string }) {
  if (searchQuery) {
    return (
      <View className="flex-1 items-center justify-center pb-[120px] px-8 py-4">
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
    <View className="flex-1 items-center justify-center pb-[120px] px-8">
      <View
        className="w-24 h-24 rounded-md bg-gray-100 mb-6"
      />PfPP

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

export function FavouritesList({
  onItemPress,
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
    refetch,
  } = useFavouritesQuery(searchQuery, enabled);
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

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.favouriteId ?? item.id}
      renderItem={({ item }) => (
        <ScanHistoryRow
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
      contentContainerStyle={items.length === 0 ? { flex: 1 } : {
        paddingBottom: 160,
        paddingTop: 16,
      }}
    />
  );
}
