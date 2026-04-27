import type { ScanHistoryItem } from '@acme/shared';
import { useCallback, useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import CompareMascot from '../../../../assets/icons/mascot/compare-mascot.svg';
import { useScanHistoryQuery } from '../../../scans/hooks/useScanHistoryQuery';
import { CompareProductPickerRow } from '../CompareProductPickerRow';
import { CustomLoader } from '../../../../shared/components/CustomLoader';
import { ScanBarcode } from 'lucide-react-native';
import { COLORS } from '../../../../shared/constants/colors';

const ITEM_HEIGHT = 84;

interface CompareProductPickerListProps {
  currentProduct: {
    barcode: string;
    productId?: string | null;
  };
  searchQuery: string;
  enabled?: boolean;
  contentPaddingBottom: number;
  maxHeight?: number;
  onSelectProduct: (item: ScanHistoryItem) => void;
}

function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <View className="items-center justify-center px-8 py-12">
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
      <CustomLoader isReversed size="sm" />
    </View>
  );
}

export function CompareProductPickerList({
  currentProduct,
  searchQuery,
  enabled = true,
  contentPaddingBottom,
  maxHeight,
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
      <View className="items-center justify-center py-8">
        <CustomLoader isReversed size="sm" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="items-center justify-center px-8 py-8">
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

  if (items.length === 0 && searchQuery.length) {
    return <EmptyState searchQuery={searchQuery} />;
  }

  if (items.length === 0) {
    return (
      <View className="mt-4 items-center justify-center px-4 pb-6">
        <CompareMascot />
        <Text className="text-center mt-6 text-[18px] font-bold">No other products available</Text>
        <Typography className="text-center mt-4 px-4">
          Scan more products to compare this item with something else
        </Typography>
        <View className="mt-4 w-full">
          <Button label={'Scan to Compare'} Icon={<ScanBarcode color={COLORS.white} />} />
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <CompareProductPickerRow item={item} onPress={onSelectProduct} />}
      style={maxHeight ? { maxHeight } : undefined}
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
