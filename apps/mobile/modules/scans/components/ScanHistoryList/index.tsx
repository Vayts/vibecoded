import type { ScanHistoryItem } from '@acme/shared';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { ScanHistoryRow } from '../ScanHistoryRow';
import { useScanHistoryQuery } from '../../hooks/useScanHistoryQuery';
import { Button } from '../../../../shared/components/Button';
import { ScanLine } from 'lucide-react-native';

interface ScanHistoryListProps {
  onScanPress: (item: ScanHistoryItem) => void;
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-blue-50">
        <ScanLine color={COLORS.primary} size={28} />
      </View>
      <Typography variant="sectionTitle" className="text-center">
        No scans yet
      </Typography>
      <Typography variant="bodySecondary" className="mt-2 text-center">
        Your recent scanned products will appear here.
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

export function ScanHistoryList({ onScanPress }: ScanHistoryListProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useScanHistoryQuery();

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
          {error?.message ?? 'Failed to load scan history'}
        </Typography>
        <View className="mt-4">
          <Button label="Retry" onPress={() => void refetch()} />
        </View>
      </View>
    );
  }

  if (items.length === 0) {
    return <EmptyState />;
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
      renderItem={({ item }) => <ScanHistoryRow item={item} onPress={onScanPress} />}
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
      contentContainerStyle={items.length === 0 ? { flex: 1 } : undefined}
    />
  );
}
