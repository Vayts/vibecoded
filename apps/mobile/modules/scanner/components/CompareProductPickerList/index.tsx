import type { ScanHistoryItem } from '@acme/shared';
import { useCallback, useMemo } from 'react';
import { FlatList, View } from 'react-native';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { useScanHistoryQuery } from '../../../scans/hooks/useScanHistoryQuery';
import { CompareProductPickerRow } from '../CompareProductPickerRow';
import { CustomLoader } from '../../../../shared/components/CustomLoader';

const ITEM_HEIGHT = 84;

interface CompareProductPickerListProps {
  currentProduct: {
    barcode: string;
    productId?: string | null;
  };
  searchQuery: string;
  enabled?: boolean;
  contentPaddingBottom: number;
  onSelectProduct: (item: ScanHistoryItem) => void;
}

function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <Typography variant="sectionTitle" className="text-center">
        {searchQuery ? 'No products found' : 'No other products available'}
      </Typography>
      <Typography variant="bodySecondary" className="mt-2 text-center text-gray-500">
        {searchQuery
          ? 'Try a different product name or brand.'
          : 'Scan more products to compare this item with something else.'}
      </Typography>
    </View>
  );
}

function ListFooter({ isFetchingNextPage }: { isFetchingNextPage: boolean }) {
  if (!isFetchingNextPage) {
    return null;
  }

  return (
    <View className="py-4 items-center">
      <CustomLoader  isReversed size="sm" />
    </View>
  );
}

export function CompareProductPickerList({
  currentProduct,
  searchQuery,
  enabled = true,
  contentPaddingBottom,
  onSelectProduct,
}: CompareProductPickerListProps) {
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

  const items = useMemo(
    () =>
      (data?.pages.flatMap((page) => page.items) ?? []).filter((item) => {
        if (item.type !== 'product' || !item.product) {
          return false;
        }

        const currentProductId = currentProduct.productId?.trim() || null;
        const itemProductId = item.product.id?.trim() || null;

        if (currentProductId && itemProductId) {
          return currentProductId !== itemProductId;
        }

        return item.product.barcode !== currentProduct.barcode;
      }),
    [currentProduct.barcode, currentProduct.productId, data?.pages],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (!enabled || isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <CustomLoader isReversed size="sm" />
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
          {error?.message ?? 'Failed to load products'}
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
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <CompareProductPickerRow item={item} onPress={onSelectProduct} />}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustContentInsets={false}
      contentInsetAdjustmentBehavior="never"
      removeClippedSubviews
      initialNumToRender={5}
      maxToRenderPerBatch={4}
      windowSize={3}
      updateCellsBatchingPeriod={24}
      getItemLayout={(_data, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      })}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.4}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      ListFooterComponent={<ListFooter isFetchingNextPage={isFetchingNextPage} />}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: contentPaddingBottom,
      }}
    />
  );
}