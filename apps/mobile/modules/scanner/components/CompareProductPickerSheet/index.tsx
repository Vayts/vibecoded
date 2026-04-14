import type { ScanHistoryItem } from '@acme/shared';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, View } from 'react-native';
import ActionSheet, { SheetManager, useSheetPayload } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '../../../../shared/components/Typography';
import { useDebounce } from '../../../../shared/hooks/useDebounce';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { ScansSearchInput } from '../../../scans/components/ScansSearchInput';
import { useCompareProductsMutation } from '../../hooks/useScannerMutations';
import { useOpenComparisonRoute } from '../../hooks/useOpenComparisonRoute';
import type { CompareProductPickerSheetPayload } from '../../types/scanner';
import { CompareProductPickerList } from '../CompareProductPickerList';

export function CompareProductPickerSheet() {
  const payload = useSheetPayload(
    SheetsEnum.CompareProductPickerSheet,
  ) as CompareProductPickerSheetPayload | null;
  const insets = useSafeAreaInsets();
  const compareMutation = useCompareProductsMutation();
  const { isPending, mutateAsync, reset } = compareMutation;
  const {
    beginPendingComparison,
    navigateToLiveComparison,
    rejectPendingComparison,
    resolvePendingComparison,
  } = useOpenComparisonRoute();
  const [searchQuery, setSearchQuery] = useState('');
  const [isListReady, setIsListReady] = useState(false);
  const isClosingForComparisonRef = useRef(false);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const debouncedSearchQuery = useDebounce(deferredSearchQuery, 220);
  const currentProduct = payload?.currentProduct;
  const currentProductKey = `${currentProduct?.productId ?? ''}:${currentProduct?.barcode ?? ''}`;

  useEffect(() => {
    setSearchQuery('');
    setIsListReady(false);
    reset();

    const interactionTask = InteractionManager.runAfterInteractions(() => {
      setIsListReady(true);
    });

    return () => {
      interactionTask.cancel();
    };
  }, [currentProductKey, reset]);

  const sheetTitle = useMemo(() => {
    if (!currentProduct?.productName) {
      return 'Compare with another';
    }

    return `Compare ${currentProduct.productName}`;
  }, [currentProduct?.productName]);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setIsListReady(false);
    if (!isClosingForComparisonRef.current) {
      reset();
    }
    isClosingForComparisonRef.current = false;
  }, [reset]);

  const handleSelectProduct = useCallback(
    async (item: ScanHistoryItem) => {
      if (!currentProduct || isPending || item.type !== 'product' || !item.product) {
        return;
      }

      const requestId = beginPendingComparison();
      isClosingForComparisonRef.current = true;

      const comparisonPromise = mutateAsync({
        barcode1: currentProduct.barcode,
        barcode2: item.product.barcode,
      })
        .then((result) => {
          resolvePendingComparison(requestId, result);
        })
        .catch((error: unknown) => {
          rejectPendingComparison(
            requestId,
            error instanceof Error ? error.message : 'Unable to compare products',
          );
        });

      await SheetManager.hide(SheetsEnum.CompareProductPickerSheet);
      navigateToLiveComparison({ closeScannerResultSheet: true });

      await comparisonPromise;
    },
    [beginPendingComparison, currentProduct, isPending, mutateAsync, navigateToLiveComparison, rejectPendingComparison, resolvePendingComparison],
  );

  if (!currentProduct) {
    return null;
  }

  return (
    <ActionSheet
      gestureEnabled={!isPending}
      useBottomSafeAreaPadding={false}
      onClose={handleClose}
      containerStyle={{ height: '88%' }}
      isModal={true}
      overdrawEnabled={false}
      disableElevation
    >
      <View className="flex-1 bg-white pt-2">
        <View className="px-4 pb-3">
          <Typography variant="pageTitle">{sheetTitle}</Typography>
          <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
            Search your scan history and pick a different product to compare against
            {currentProduct.productName ? ` ${currentProduct.productName}.` : ' this product.'}
          </Typography>
        </View>

        <ScansSearchInput
          className="mx-4 mb-3"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View className="flex-1">
          <CompareProductPickerList
            currentProduct={currentProduct}
            searchQuery={debouncedSearchQuery}
            enabled={isListReady}
            contentPaddingBottom={insets.bottom + 32}
            onSelectProduct={handleSelectProduct}
          />
        </View>
      </View>
    </ActionSheet>
  );
}