import type { ScanHistoryItem } from '@acme/shared';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { ScanHistoryRow } from '../ScanHistoryRow';
import { useScanHistoryQuery } from '../../hooks/useScanHistoryQuery';
import { useProfileScoreChipContext } from '../../hooks/useProfileScoreChipContext';
import { Button } from '../../../../shared/components/Button';
import ScanningArrow from '../../../../assets/scanning_arrow.svg';

interface ScanHistoryListProps {
  onScanPress: (item: ScanHistoryItem) => void;
  searchQuery: string;
  enabled?: boolean;
  filterItem?: (item: ScanHistoryItem) => boolean;
  renderEmptyState?: (searchQuery: string) => ReactNode;
  contentPaddingBottom?: number;
}

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

export function ScanHistoryList({
  onScanPress,
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
    refetch,
  } = useScanHistoryQuery(searchQuery, enabled);
  const profileScoreChipContext = useProfileScoreChipContext();

  const items = (data?.pages.flatMap((page) => page.items) ?? []).filter((item) =>
    filterItem ? filterItem(item) : true,
  );

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
        <ScanHistoryRow
          item={item}
          onPress={onScanPress}
          profileScoreChipContext={profileScoreChipContext}
        />
      )}
      automaticallyAdjustContentInsets={false}
      contentInsetAdjustmentBehavior="never"
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
      contentContainerStyle={items.length === 0 ? { 
        flex: 1 
      } : {
        paddingBottom: contentPaddingBottom,
        paddingTop: 16,
      }}
    />
  );
}