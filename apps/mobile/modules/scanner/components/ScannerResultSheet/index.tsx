import { useCallback, useMemo, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import ActionSheet, {
  type ActionSheetRef,
  useSheetPayload,
} from 'react-native-actions-sheet';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useScannerResultSheetStore } from '../../stores/scannerResultSheetStore';
import { ProductResultContent } from './ProductResultContent';
import { ScanDetailLoader } from './ScanDetailLoader';
import { getPreviewSnapPoint } from './previewSnapPoint';

export function ScannerResultSheet() {
  const payload = useSheetPayload(SheetsEnum.ScannerResultSheet);
  const { height: windowHeight } = useWindowDimensions();
  const sheetRef = useRef<ActionSheetRef>(null);
  const reset = useScannerResultSheetStore((s) => s.reset);
  const storeResult = useScannerResultSheetStore((s) => s.result);
  const storeResolvedPersonalResult = useScannerResultSheetStore(
    (s) => s.resolvedPersonalResult,
  );
  const [snapIndex, setSnapIndex] = useState(0);
  const resolvedResult = storeResult ?? payload?.result;
  const resolvedPersonalResult =
    storeResolvedPersonalResult ?? payload?.resolvedPersonalResult;
  const scanId = payload?.scanId;
  const item = payload?.item;
  const previewProduct = payload?.previewProduct;
  const previewImageUri = payload?.previewImageUri;
  const hasPreviewState = Boolean(item?.product || previewProduct || resolvedResult?.success);
  const hasSummaryContent = Boolean(
    item?.type === 'product' &&
      (item.profileChips?.length || item.personalScore != null || item.overallScore != null || item.personalAnalysisStatus === 'pending'),
  );
  const previewNutriScoreGrade =
    (item?.type === 'product' ? item.product?.nutriscore_grade : null) ??
    previewProduct?.nutriscore_grade ??
    (resolvedResult?.success ? resolvedResult.product.scores.nutriscore_grade : null);

  const handleSnapIndexChange = useCallback((nextSnapIndex: number) => {
    setSnapIndex(nextSnapIndex);
  }, []);

  const handleClose = useCallback(() => {
    setSnapIndex(0);
    reset();
  }, [reset]);

  const handleExpandDetails = useCallback(() => {
    if (!hasPreviewState) {
      return;
    }

    sheetRef.current?.snapToIndex(1);
  }, [hasPreviewState]);

  const previewSnapPoint = useMemo(() => {
    return getPreviewSnapPoint({
      windowHeight,
      hasPreviewState,
      hasSummaryContent,
      nutriScoreGrade: previewNutriScoreGrade,
    });
  }, [hasPreviewState, hasSummaryContent, previewNutriScoreGrade, windowHeight]);

  const snapPoints = useMemo(
    () => (hasPreviewState ? [previewSnapPoint, 100] : [100]),
    [hasPreviewState, previewSnapPoint],
  );

  return (
    <ActionSheet
      ref={sheetRef}
      snapPoints={snapPoints}
      gestureEnabled
      useBottomSafeAreaPadding={false}
      onClose={handleClose}
      onSnapIndexChange={handleSnapIndexChange}
      containerStyle={{height: '100%'}}
    >
      {scanId ? (
          <ScanDetailLoader
            scanId={scanId}
            previewItem={item}
            previewProduct={previewProduct}
            previewImageUri={previewImageUri}
            snapIndex={snapIndex}
            onExpandDetails={handleExpandDetails}
          />
        ) : resolvedResult || previewProduct || item ? (
          <ProductResultContent
            previewItem={item}
            result={resolvedResult}
            previewProduct={previewProduct}
            previewImageUri={previewImageUri}
            resolvedPersonalResult={resolvedPersonalResult}
            snapIndex={snapIndex}
            onExpandDetails={handleExpandDetails}
          />
        ) : null}
    </ActionSheet>
  );
}
