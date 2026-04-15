import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import ActionSheet, {
  type ActionSheetRef,
  useSheetPayload,
} from 'react-native-actions-sheet';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useScannerResultSheetStore } from '../../stores/scannerResultSheetStore';
import { ProductResultContent } from './ProductResultContent';
import { getPreviewProductConflictTitle } from './ProductConflictAlert';
import { hasProductResult } from './productResultHelpers';
import { getActiveProfile } from './productResultPreviewHelpers';
import { ScanDetailLoader } from './ScanDetailLoader';
import { getPreviewSnapPoint } from './previewSnapPoint';

const MIN_AUTO_EXPAND_DELAY_MS = 250;
const FAST_RESPONSE_SETTLE_DELAY_MS = 180;

export function ScannerResultSheet() {
  const payload = useSheetPayload(SheetsEnum.ScannerResultSheet);
  const { height: windowHeight } = useWindowDimensions();
  const sheetRef = useRef<ActionSheetRef>(null);
  const autoExpandFrameRef = useRef<number | null>(null);
  const autoExpandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadingStartedAtRef = useRef<number | null>(null);
  const reset = useScannerResultSheetStore((s) => s.reset);
  const isLoadingInitialResult = useScannerResultSheetStore(
    (s) => s.isLoadingInitialResult,
  );
  const storeResult = useScannerResultSheetStore((s) => s.result);
  const storeResolvedPersonalResult = useScannerResultSheetStore(
    (s) => s.resolvedPersonalResult,
  );
  const [snapIndex, setSnapIndex] = useState(0);
  const previousInitialLoadingRef = useRef(false);
  const resolvedResult = storeResult ?? payload?.result;
  const resolvedPersonalResult =
    storeResolvedPersonalResult ?? payload?.resolvedPersonalResult;
  const scanId = payload?.scanId;
  const item = payload?.item;
  const previewProduct = payload?.previewProduct;
  const previewImageUri = payload?.previewImageUri;
  const hasPreviewState = Boolean(item?.product || previewProduct || resolvedResult?.success);
  const hasHistorySummaryContent = Boolean(
    item?.type === 'product' &&
      (item.profileChips?.length || item.personalScore != null || item.overallScore != null || item.personalAnalysisStatus === 'pending'),
  );
  const hasLiveSummaryContent = Boolean(previewProduct && !scanId);
  const hasSummaryContent = hasHistorySummaryContent || hasLiveSummaryContent;
  const previewNutriScoreGrade =
    (item?.type === 'product' ? item.product?.nutriscore_grade : null) ??
    previewProduct?.nutriscore_grade ??
    (resolvedResult?.success ? resolvedResult.product.scores.nutriscore_grade : null);

  const handleSnapIndexChange = useCallback((nextSnapIndex: number) => {
    setSnapIndex(nextSnapIndex);
  }, []);

  const clearScheduledAutoExpand = useCallback(() => {
    if (autoExpandTimeoutRef.current != null) {
      clearTimeout(autoExpandTimeoutRef.current);
      autoExpandTimeoutRef.current = null;
    }

    if (autoExpandFrameRef.current != null) {
      cancelAnimationFrame(autoExpandFrameRef.current);
      autoExpandFrameRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    clearScheduledAutoExpand();
    initialLoadingStartedAtRef.current = null;
    setSnapIndex(0);
    reset();
  }, [clearScheduledAutoExpand, reset]);

  const handleExpandDetails = useCallback(() => {
    if (!hasPreviewState) {
      return;
    }

    sheetRef.current?.snapToIndex(1);
  }, [hasPreviewState]);

  useEffect(() => {
    const wasLoadingInitialResult = previousInitialLoadingRef.current;

    if (
      !wasLoadingInitialResult &&
      isLoadingInitialResult &&
      !scanId
    ) {
      clearScheduledAutoExpand();
      initialLoadingStartedAtRef.current = Date.now();
    }

    if (
      wasLoadingInitialResult &&
      !isLoadingInitialResult &&
      !scanId &&
      hasPreviewState &&
      snapIndex === 0
    ) {
      const startedAt = initialLoadingStartedAtRef.current ?? Date.now();
      const elapsed = Date.now() - startedAt;
      const remainingDelay = Math.max(0, MIN_AUTO_EXPAND_DELAY_MS - elapsed);
      const autoExpandDelay =
        remainingDelay > 0
          ? remainingDelay + FAST_RESPONSE_SETTLE_DELAY_MS
          : 0;

      clearScheduledAutoExpand();
      autoExpandTimeoutRef.current = setTimeout(() => {
        autoExpandFrameRef.current = requestAnimationFrame(() => {
          sheetRef.current?.snapToIndex(1);
          autoExpandFrameRef.current = null;
        });
        autoExpandTimeoutRef.current = null;
      }, autoExpandDelay);
      initialLoadingStartedAtRef.current = null;
    }

    previousInitialLoadingRef.current = isLoadingInitialResult;
  }, [clearScheduledAutoExpand, hasPreviewState, isLoadingInitialResult, scanId, snapIndex]);

  useEffect(() => {
    return () => {
      clearScheduledAutoExpand();
    };
  }, [clearScheduledAutoExpand]);

  const previewSnapPoint = useMemo(() => {
    return getPreviewSnapPoint({
      windowHeight,
      hasPreviewState,
      hasSummaryContent,
      nutriScoreGrade: previewNutriScoreGrade,
    });
  }, [
    hasPreviewState,
    hasSummaryContent,
    previewNutriScoreGrade,
    windowHeight,
  ]);
  const detailState = useMemo(() => {
    if (!isLoadingInitialResult || scanId || resolvedResult || !hasPreviewState) {
      return undefined;
    }

    return {
      isLoading: true,
      isError: false,
    };
  }, [hasPreviewState, isLoadingInitialResult, resolvedResult, scanId]);

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
      containerStyle={{height: '100%', borderTopLeftRadius: 32, borderTopRightRadius: 32 }}
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
            scanId={scanId}
            previewProduct={previewProduct}
            previewImageUri={previewImageUri}
            resolvedPersonalResult={resolvedPersonalResult}
            isInitialLoadingResult={!scanId && isLoadingInitialResult}
            snapIndex={snapIndex}
            onExpandDetails={handleExpandDetails}
            detailState={detailState}
          />
        ) : null}
    </ActionSheet>
  );
}
