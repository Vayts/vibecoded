import type { ScanHistoryItem } from '@acme/shared';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { InteractionManager, View } from 'react-native';
import ActionSheet, { SheetManager, useSheetPayload } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { useDebounce } from '../../../../shared/hooks/useDebounce';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { ScansSearchInput } from '../../../scans/components/ScansSearchInput';
import { useCompareProductsMutation } from '../../hooks/useScannerMutations';
import type { CompareProductPickerSheetPayload } from '../../types/scanner';
import { CompareProductPickerList } from '../CompareProductPickerList';
import { CustomLoader } from '../../../../shared/components/CustomLoader';

export function CompareProductPickerSheet() {
  const payload = useSheetPayload(
    SheetsEnum.CompareProductPickerSheet,
  ) as CompareProductPickerSheetPayload | null;
  const insets = useSafeAreaInsets();
  const compareMutation = useCompareProductsMutation();
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isListReady, setIsListReady] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const debouncedSearchQuery = useDebounce(deferredSearchQuery, 220);
  const currentProduct = payload?.currentProduct;
  const currentProductKey = `${currentProduct?.productId ?? ''}:${currentProduct?.barcode ?? ''}`;

  useEffect(() => {
    setSearchQuery('');
    setErrorMessage(null);
    setIsListReady(false);
    compareMutation.reset();

    const interactionTask = InteractionManager.runAfterInteractions(() => {
      setIsListReady(true);
    });

    return () => {
      interactionTask.cancel();
    };
  }, [currentProductKey]);

  const sheetTitle = useMemo(() => {
    if (!currentProduct?.productName) {
      return 'Compare with another';
    }

    return `Compare ${currentProduct.productName}`;
  }, [currentProduct?.productName]);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setErrorMessage(null);
    setIsListReady(false);
    compareMutation.reset();
  }, [compareMutation]);

  const handleSelectProduct = useCallback(
    async (item: ScanHistoryItem) => {
      if (!currentProduct || compareMutation.isPending || item.type !== 'product' || !item.product) {
        return;
      }

      setErrorMessage(null);

      try {
        const result = await compareMutation.mutateAsync({
          barcode1: currentProduct.barcode,
          barcode2: item.product.barcode,
        });

        await SheetManager.hide(SheetsEnum.CompareProductPickerSheet);
        await SheetManager.show(SheetsEnum.ComparisonResultSheet, {
          payload: { result },
        });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to compare products');
      }
    },
    [compareMutation, currentProduct],
  );

  if (!currentProduct) {
    return null;
  }

  return (
    <ActionSheet
      gestureEnabled={!compareMutation.isPending}
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

        {errorMessage ? (
          <View className="px-4 pb-3">
            <Typography variant="bodySecondary" className="text-center text-red-500">
              {errorMessage}
            </Typography>
          </View>
        ) : null}

        <View className="flex-1">
          <CompareProductPickerList
            currentProduct={currentProduct}
            searchQuery={debouncedSearchQuery}
            enabled={isListReady}
            contentPaddingBottom={insets.bottom + 32}
            onSelectProduct={handleSelectProduct}
          />
        </View>

        {compareMutation.isPending ? (
          <View className="absolute inset-0 items-center justify-center bg-white/80 px-6">
            <View className="items-center rounded-3xl px-6 py-5" style={{ backgroundColor: COLORS.white }}>
              <CustomLoader isReversed size="sm" />
              <Typography variant="bodySecondary" className="mt-3 text-center text-gray-500">
                Preparing comparison…
              </Typography>
            </View>
          </View>
        ) : null}
      </View>
    </ActionSheet>
  );
}