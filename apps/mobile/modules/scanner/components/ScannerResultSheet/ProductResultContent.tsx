import type { AnalysisJobResponse, BarcodeLookupResponse, ProductPreview, ScanHistoryItem } from '@acme/shared';
import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';
import { usePersonalAnalysisQuery } from '../../api/scannerQueries';
import { DetailStateContent, type ProductResultDetailState } from './DetailStateContent';
import { hasProductResult } from './productResultHelpers';
import { NotFoundContent } from './NotFoundContent';
import { ScrollView } from 'react-native-actions-sheet';
import { PersonalTabContent } from './PersonalTabContent';
import { PreviewSummaryContent } from './PreviewSummaryContent';
import { ProductResultBottomActions } from './ProductResultBottomActions';
import { ProductResultHero } from './ProductResultHero';
import { ScanDeleteAction } from './ScanDeleteAction';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { getCompareSource, getDisplayedNutriScoreGrade, getPreviewHistoryProduct, getPreviewSummaryState } from './productResultPreviewHelpers';

const TRANSITION_DURATION_MS = 200;
const DEFAULT_PROFILE_ID = 'you';

interface ProductResultContentProps {
  previewItem?: ScanHistoryItem;
  result?: BarcodeLookupResponse;
  scanId?: string;
  previewProduct?: ProductPreview;
  previewImageUri?: string | null;
  resolvedPersonalResult?: AnalysisJobResponse;
  isInitialLoadingResult?: boolean;
  snapIndex: number;
  onExpandDetails: () => void;
  onPreviewStateChange?: (state: {
    hasSummaryContent: boolean;
    nutriScoreGrade: string | null | undefined;
  }) => void;
  detailState?: ProductResultDetailState;
}

export function ProductResultContent({
  previewItem,
  result,
  scanId,
  previewProduct,
  previewImageUri,
  resolvedPersonalResult,
  isInitialLoadingResult = false,
  snapIndex,
  onExpandDetails,
  onPreviewStateChange,
  detailState,
}: ProductResultContentProps) {
  const insets = useSafeAreaInsets();
  const [selectedProfileId, setSelectedProfileId] = useState<string>(DEFAULT_PROFILE_ID);
  const successResult = result && hasProductResult(result) ? result : undefined;
  const initialAnalysis = resolvedPersonalResult
    ? resolvedPersonalResult
    : successResult ? successResult.personalAnalysis : undefined;
  const personalQuery = usePersonalAnalysisQuery(initialAnalysis);
  const personalData = personalQuery.data ?? initialAnalysis;
  const personalError =
    Boolean(initialAnalysis?.analysisId) &&
    !personalData?.result && (personalData?.status === 'failed' || personalQuery.isError);
  const personalRetry = () => {};
  const isExpanded = snapIndex > 0;
  const previewHistoryProduct = getPreviewHistoryProduct(previewItem);
  const summaryState = getPreviewSummaryState({
    previewItem,
    previewProduct,
    isInitialLoadingResult,
    personalResult: personalData,
    personalStatus: personalData?.status,
  });
  const resolvedScanId = scanId ?? successResult?.scanId ?? (previewItem?.type === 'product' ? previewItem.id : undefined);
  const summaryOpacity = useRef(new Animated.Value(isExpanded ? 0 : 1)).current;
  const detailOpacity = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(summaryOpacity, {
        toValue: isExpanded ? 0 : 1,
        duration: TRANSITION_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(detailOpacity, {
        toValue: isExpanded ? 1 : 0,
        duration: TRANSITION_DURATION_MS,
        useNativeDriver: true,
      }),
    ]).start();
  }, [detailOpacity, isExpanded, summaryOpacity]);

  if (result?.success === false) {
    return <NotFoundContent result={result} />;
  }

  const product = successResult?.product ?? previewProduct ?? previewHistoryProduct;
  const resolvedProductId = successResult?.productId ?? previewProduct?.productId ?? previewHistoryProduct?.id;
  const resolvedIsFavourite =
    successResult?.isFavourite ??
    (previewItem?.type === 'product' ? previewItem.isFavourite : false) ??
    false;
  const compareSource = getCompareSource({ product, previewHistoryProduct, previewProduct, successResult });
  const nutriScoreGrade = getDisplayedNutriScoreGrade({ isExpanded, previewHistoryProduct, previewProduct, successResult });
  const errorBottomAction = resolvedScanId ? <ScanDeleteAction scanId={resolvedScanId} /> : null;

  useEffect(() => {
    onPreviewStateChange?.({
      hasSummaryContent: summaryState.hasSummaryContent,
      nutriScoreGrade,
    });
  }, [nutriScoreGrade, onPreviewStateChange, summaryState.hasSummaryContent]);

  if (!product) {
    return <DetailStateContent detailState={detailState} bottomAction={errorBottomAction} />;
  }

  const handleComparePress = () => {
    if (!compareSource?.barcode) {
      return;
    }
    void SheetManager.show(SheetsEnum.CompareProductPickerSheet, {
      payload: {
        currentProduct: compareSource,
      },
    });
  };

  return (
    <ScrollView
      scrollEnabled={isExpanded}
      showsVerticalScrollIndicator={isExpanded}
      className="flex-1"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      <View>
        <ProductResultHero
          nutriScoreGrade={nutriScoreGrade}
          previewImageUri={previewImageUri}
          product={product}
        />
        <View className="relative">
          {summaryState.hasSummaryContent ? (
            <Animated.View
              pointerEvents={isExpanded ? 'none' : 'auto'}
              className="absolute left-4 right-4 -top-4 z-10"
              style={{ opacity: summaryOpacity }}
            >
              {summaryState.hasSummaryContent ? (
                <PreviewSummaryContent
                  chips={summaryState.previewChips}
                  score={summaryState.previewScore}
                  showPendingSummary={summaryState.showHistoryPendingSummary || summaryState.showLivePendingSummary}
                  isLoading={isInitialLoadingResult}
                  showActions={!isInitialLoadingResult && !summaryState.showLivePendingSummary}
                  onComparePress={handleComparePress}
                  isCompareDisabled={!compareSource?.barcode}
                  onExpandDetails={onExpandDetails}
                />
              ) : null}
            </Animated.View>
          ) : null}
          <Animated.View
            pointerEvents={isExpanded ? 'auto' : 'none'}
            style={{ opacity: detailOpacity }}
          >
            {detailState?.isLoading || detailState?.isError ? (
              <DetailStateContent detailState={detailState} bottomAction={errorBottomAction} />
            ) : (
              <PersonalTabContent
                bottomAction={
                  <ProductResultBottomActions
                    scanId={resolvedScanId}
                    productId={resolvedProductId}
                    isFavourite={resolvedIsFavourite}
                    isCompareDisabled={!compareSource?.barcode}
                    onComparePress={handleComparePress}
                  />
                }
                personalResult={personalData}
                isError={personalError}
                onRetry={personalRetry}
                onSelectProfile={setSelectedProfileId}
                rawIngredients={successResult?.product.ingredients ?? []}
                rawIngredientsText={successResult?.product.ingredients_text ?? null}
                selectedProfileId={selectedProfileId}
              />
            )}
          </Animated.View>
        </View>
      </View>
    </ScrollView>
  );
}
