import { useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import ActionSheet, { useSheetPayload } from 'react-native-actions-sheet';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useScannerResultSheetStore } from '../../stores/scannerResultSheetStore';
import { ScannerResultSheetContent } from './ScannerResultSheetContent';

const MAX_SHEET_HEIGHT_RATIO = 0.9;

export function ScannerResultSheet() {
  const payload = useSheetPayload(SheetsEnum.ScannerResultSheet);
  const { height: windowHeight } = useWindowDimensions();
  const reset = useScannerResultSheetStore((s) => s.reset);
  const isLoadingInitialResult = useScannerResultSheetStore((s) => s.isLoadingInitialResult);
  const storeResult = useScannerResultSheetStore((s) => s.result);
  const storeResolvedPersonalResult = useScannerResultSheetStore((s) => s.resolvedPersonalResult);
  const resolvedResult = storeResult ?? payload?.result;
  const resolvedPersonalResult = storeResolvedPersonalResult ?? payload?.resolvedPersonalResult;
  const scanId = payload?.scanId;
  const item = payload?.item;
  const previewProduct = payload?.previewProduct;

  const handleClose = useCallback(() => {
    reset();
  }, [reset]);

  const detailState =
    !isLoadingInitialResult || scanId || resolvedResult
      ? undefined
      : { isLoading: true, isError: false };
  const maxSheetHeight = windowHeight * MAX_SHEET_HEIGHT_RATIO;

  return (
    <ActionSheet
      gestureEnabled
      useBottomSafeAreaPadding={false}
      onClose={handleClose}
      containerStyle={{ maxHeight: maxSheetHeight, borderTopLeftRadius: 32, borderTopRightRadius: 32 }}
    >
      <ScannerResultSheetContent
        scanId={scanId}
        item={item}
        previewProduct={previewProduct}
        result={resolvedResult}
        resolvedPersonalResult={resolvedPersonalResult}
        detailState={detailState}
      />
    </ActionSheet>
  );
}
