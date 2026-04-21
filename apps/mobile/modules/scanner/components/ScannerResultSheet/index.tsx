import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import ActionSheet, { type ActionSheetRef, useSheetPayload } from 'react-native-actions-sheet';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { useScannerResultSheetStore } from '../../stores/scannerResultSheetStore';
import { ScannerResultSheetContent } from './ScannerResultSheetContent';
import { getDisplayedNutriScoreGrade, getPreviewSummaryState } from './productResultPreviewHelpers';
import { getPreviewSnapPoint } from './previewSnapPoint';

const MIN_AUTO_EXPAND_DELAY_MS = 250;
const FAST_RESPONSE_SETTLE_DELAY_MS = 180;

type PreviewLayoutState = {
  hasSummaryContent: boolean;
  nutriScoreGrade: string | null | undefined;
};

export function ScannerResultSheet() {
  const payload = useSheetPayload(SheetsEnum.ScannerResultSheet);
  const { height: windowHeight } = useWindowDimensions();
  const sheetRef = useRef<ActionSheetRef>(null);
  const autoExpandFrameRef = useRef<number | null>(null);
  const autoExpandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadingStartedAtRef = useRef<number | null>(null);
  const previousPreviewSnapPointRef = useRef<number | null>(null);
  const reset = useScannerResultSheetStore((s) => s.reset);
  const isLoadingInitialResult = useScannerResultSheetStore((s) => s.isLoadingInitialResult);
  const storeResult = useScannerResultSheetStore((s) => s.result);
  const storeResolvedPersonalResult = useScannerResultSheetStore((s) => s.resolvedPersonalResult);
  const payloadInitialSnapIndex = payload?.initialSnapIndex ?? 0;
  const [snapIndex, setSnapIndex] = useState(payloadInitialSnapIndex);
  const [previewLayoutState, setPreviewLayoutState] = useState<PreviewLayoutState | null>(null);
  const previousInitialLoadingRef = useRef(false);
  const resolvedResult = storeResult ?? payload?.result;
  const resolvedPersonalResult = storeResolvedPersonalResult ?? payload?.resolvedPersonalResult;
  const initialAnalysis =
    resolvedPersonalResult ??
    (resolvedResult?.success ? resolvedResult.personalAnalysis : undefined);
  const scanId = payload?.scanId;
  const item = payload?.item;
  const previewProduct = payload?.previewProduct;
  const previewStateKey = `${scanId ?? 'live'}:${item?.id ?? 'none'}:${previewProduct?.barcode ?? 'none'}:${previewProduct?.image_url ?? 'none'}`;
  const hasPreviewState = Boolean(item?.product || previewProduct || resolvedResult?.success);
  const fallbackPreviewSummaryState = useMemo(
    () =>
      getPreviewSummaryState({
        previewItem: item,
        previewProduct,
        isInitialLoadingResult: isLoadingInitialResult,
        personalResult: initialAnalysis,
        personalStatus: initialAnalysis?.status,
      }),
    [initialAnalysis, isLoadingInitialResult, item, previewProduct],
  );
  const fallbackPreviewNutriScoreGrade = useMemo(
    () =>
      getDisplayedNutriScoreGrade({
        isExpanded: false,
        previewHistoryProduct: item?.type === 'product' ? item.product : null,
        previewProduct,
        successResult: resolvedResult?.success ? resolvedResult : undefined,
      }),
    [item, previewProduct, resolvedResult],
  );
  const previewSummaryState =
    previewLayoutState?.hasSummaryContent ?? fallbackPreviewSummaryState.hasSummaryContent;
  const previewNutriScoreGrade =
    previewLayoutState?.nutriScoreGrade ?? fallbackPreviewNutriScoreGrade;

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
    previousPreviewSnapPointRef.current = null;
    setPreviewLayoutState(null);
    setSnapIndex(0);
    reset();
  }, [clearScheduledAutoExpand, reset]);

  const handlePreviewStateChange = useCallback((state: PreviewLayoutState) => {
    setPreviewLayoutState((current) => {
      if (
        current?.hasSummaryContent === state.hasSummaryContent &&
        current?.nutriScoreGrade === state.nutriScoreGrade
      ) {
        return current;
      }

      return state;
    });
  }, []);

  const handleExpandDetails = useCallback(() => {
    if (!hasPreviewState) {
      return;
    }

    sheetRef.current?.snapToIndex(1);
  }, [hasPreviewState]);

  useEffect(() => {
    const wasLoadingInitialResult = previousInitialLoadingRef.current;

    if (!wasLoadingInitialResult && isLoadingInitialResult && !scanId) {
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
        remainingDelay > 0 ? remainingDelay + FAST_RESPONSE_SETTLE_DELAY_MS : 0;

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
    previousPreviewSnapPointRef.current = null;
    setPreviewLayoutState(null);
    setSnapIndex(payloadInitialSnapIndex);
  }, [payloadInitialSnapIndex, previewStateKey]);

  useEffect(() => () => clearScheduledAutoExpand(), [clearScheduledAutoExpand]);

  const previewSnapPoint = useMemo(
    () =>
      getPreviewSnapPoint({
        windowHeight,
        hasPreviewState,
        hasSummaryContent: previewSummaryState,
        nutriScoreGrade: previewNutriScoreGrade,
      }),
    [hasPreviewState, previewNutriScoreGrade, previewSummaryState, windowHeight],
  );

  const detailState =
    !isLoadingInitialResult || scanId || resolvedResult || !hasPreviewState
      ? undefined
      : { isLoading: true, isError: false };

  const snapPoints = hasPreviewState ? [previewSnapPoint, 100] : [100];

  useEffect(() => {
    const previousPreviewSnapPoint = previousPreviewSnapPointRef.current;
    previousPreviewSnapPointRef.current = previewSnapPoint;

    if (
      !hasPreviewState ||
      snapIndex !== 0 ||
      previousPreviewSnapPoint == null ||
      previousPreviewSnapPoint === previewSnapPoint
    ) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      sheetRef.current?.snapToIndex(0);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [hasPreviewState, previewSnapPoint, snapIndex]);

  return (
    <ActionSheet
      ref={sheetRef}
      snapPoints={snapPoints}
      gestureEnabled
      useBottomSafeAreaPadding={false}
      onClose={handleClose}
      onSnapIndexChange={setSnapIndex}
      containerStyle={{ height: '100%', borderTopLeftRadius: 32, borderTopRightRadius: 32 }}
    >
      <ScannerResultSheetContent
        scanId={scanId}
        item={item}
        previewProduct={previewProduct}
        snapIndex={snapIndex}
        result={resolvedResult}
        resolvedPersonalResult={resolvedPersonalResult}
        isLoadingInitialResult={isLoadingInitialResult}
        onExpandDetails={handleExpandDetails}
        onPreviewStateChange={handlePreviewStateChange}
        detailState={detailState}
      />
    </ActionSheet>
  );
}
