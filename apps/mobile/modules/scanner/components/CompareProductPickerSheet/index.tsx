import type { ScanHistoryItem } from '@acme/shared';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, View } from 'react-native';
import ActionSheet, { SheetManager, useSheetPayload } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera } from 'lucide-react-native';

import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { useDebounce } from '../../../../shared/hooks/useDebounce';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { ScansSearchInput } from '../../../scans/components/ScansSearchInput';
import { useStartScanToCompare } from '../../hooks/useStartScanToCompare';
import { useCompareProductsMutation } from '../../hooks/useScannerMutations';
import { useOpenComparisonRoute } from '../../hooks/useOpenComparisonRoute';
import type { CompareProductPickerSheetPayload } from '../../types/scanner';
import { CompareProductPickerList } from '../CompareProductPickerList';

const SCAN_TO_COMPARE_FOOTER_HEIGHT = 88;

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
  const startScanToCompare = useStartScanToCompare();

  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const debouncedSearchQuery = useDebounce(deferredSearchQuery, 220);

  const currentProduct = payload?.currentProduct;
  const currentProductKey = `${currentProduct?.productId ?? ''}:${currentProduct?.barcode ?? ''}`;

  const footerBottomOffset = insets.bottom + 12;
  const listBottomPadding = SCAN_TO_COMPARE_FOOTER_HEIGHT + insets.bottom + 24;

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
    [
      beginPendingComparison,
      currentProduct,
      isPending,
      mutateAsync,
      navigateToLiveComparison,
      rejectPendingComparison,
      resolvePendingComparison,
    ],
  );

  const handleScanToCompare = useCallback(async () => {
    if (!currentProduct || isPending) {
      return;
    }

    isClosingForComparisonRef.current = true;

    startScanToCompare(currentProduct, {
      source: 'compare-picker',
    });

    setImmediate(() => {
      void SheetManager.hideAll();
    });
  }, [currentProduct, isPending, startScanToCompare]);

  if (!currentProduct) {
    return null;
  }

  return (
    <ActionSheet
      gestureEnabled={!isPending}
      useBottomSafeAreaPadding={false}
      onClose={handleClose}
      containerStyle={{
        height: '88%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
      }}
      isModal
      overdrawEnabled={false}
      disableElevation
    >
      <View className="relative flex-1 bg-white pt-2">
        <View className="px-4 pb-3">
          <Typography variant="pageTitle">{sheetTitle}</Typography>

          <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-500">
            Compare against a product from your history, or scan a new one to compare with
            {currentProduct.productName ? ` ${currentProduct.productName}.` : ' this product.'}
          </Typography>
        </View>

        <View className="px-4 pb-4">
          <Typography variant="sectionTitle">Compare with history product</Typography>

          <Typography variant="bodySecondary" className="mt-2 text-gray-500">
            Search your scan history and pick a different product to compare against.
          </Typography>
        </View>

        <ScansSearchInput className="mx-4 mb-3" value={searchQuery} onChangeText={setSearchQuery} />

        <View className="flex-1">
          <CompareProductPickerList
            currentProduct={currentProduct}
            searchQuery={debouncedSearchQuery}
            enabled={isListReady}
            contentPaddingBottom={listBottomPadding}
            onSelectProduct={handleSelectProduct}
          />
        </View>

        <View
          pointerEvents="box-none"
          className="absolute left-0 right-0 px-4 pt-3 bg-white"
          style={{
            bottom: footerBottomOffset,
            paddingBottom: 0,
          }}
        >
          <Button
            fullWidth
            variant="secondary"
            label="Scan to Compare"
            disabled={isPending}
            accessibilityLabel="Scan a new product to compare"
            accessibilityRole="button"
            Icon={<Camera size={18} color={COLORS.gray700} strokeWidth={1.9} />}
            onPress={() => {
              void handleScanToCompare();
            }}
          />
        </View>
      </View>
    </ActionSheet>
  );
}
