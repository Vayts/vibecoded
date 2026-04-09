import type {
  AnalysisJobResponse,
  BarcodeLookupResponse,
  ProductPreview,
  ScanHistoryItem,
} from '@acme/shared';
import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useProfileScoreChipContext } from '../../../scans/hooks/useProfileScoreChipContext';
import { usePersonalAnalysisQuery } from '../../api/scannerQueries';
import { DetailStateContent, type ProductResultDetailState } from './DetailStateContent';
import { hasProductResult } from './productResultHelpers';
import { NotFoundContent } from './NotFoundContent';
import { ScrollView } from 'react-native-actions-sheet';
import { PersonalTabContent } from './PersonalTabContent';
import { PreviewSummaryContent } from './PreviewSummaryContent';
import { ProductResultHeader } from './ProductResultHeader';
import { NutriScoreBlock } from './NutriScoreBlock';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TRANSITION_DURATION_MS = 200;

interface ProductResultContentProps {
  previewItem?: ScanHistoryItem;
  result?: BarcodeLookupResponse;
  previewProduct?: ProductPreview;
  previewImageUri?: string | null;
  resolvedPersonalResult?: AnalysisJobResponse;
  isInitialLoadingResult?: boolean;
  snapIndex: number;
  onExpandDetails: () => void;
  detailState?: ProductResultDetailState;
}

const getPreviewHistoryProduct = (previewItem?: ScanHistoryItem) => {
  if (previewItem?.type !== 'product') {
    return null;
  }

  return previewItem.product;
};

export function ProductResultContent({
  previewItem,
  result,
  previewProduct,
  previewImageUri,
  resolvedPersonalResult,
  isInitialLoadingResult = false,
  snapIndex,
  onExpandDetails,
  detailState,
}: ProductResultContentProps) {
  const insets = useSafeAreaInsets();
  const profileScoreChipContext = useProfileScoreChipContext();
  const successResult = result && hasProductResult(result) ? result : undefined;
  const initialAnalysis = resolvedPersonalResult
    ? resolvedPersonalResult
    : successResult
      ? successResult.personalAnalysis
      : undefined;
  const personalQuery = usePersonalAnalysisQuery(initialAnalysis);

  const personalData = personalQuery.data ?? initialAnalysis;
  const personalError =
    Boolean(initialAnalysis?.analysisId) &&
    !personalData?.result &&
    (personalData?.status === 'failed' || personalQuery.isError);
  const personalRetry = () => {};
  const isExpanded = snapIndex > 0;
  const previewHistoryProduct = getPreviewHistoryProduct(previewItem);
  const isLiveFlow = Boolean(previewProduct) && !previewItem;
  const previewChips = previewItem?.type === 'product' ? previewItem.profileChips : undefined;
  const previewScore =
    previewItem?.type === 'product'
      ? previewItem.personalScore ?? previewItem.overallScore
      : null;
  const showHistoryPendingSummary =
    previewItem?.type === 'product' &&
    !previewChips?.length &&
    previewScore == null &&
    previewItem.personalAnalysisStatus === 'pending';
  const hasHistorySummaryContent = Boolean(
    previewChips?.length || previewScore != null || showHistoryPendingSummary,
  );
  const showLivePendingSummary =
    isLiveFlow &&
    !isInitialLoadingResult &&
    personalData?.status === 'pending';
  const hasLiveSummaryContent = isLiveFlow;
  const hasSummaryContent = hasHistorySummaryContent || hasLiveSummaryContent;
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
  const expandedNutriScoreGrade =
    successResult?.product.scores.nutriscore_grade ??
    previewProduct?.nutriscore_grade ??
    previewHistoryProduct?.nutriscore_grade ??
    null;
  const previewNutriScoreGrade =
    previewHistoryProduct?.nutriscore_grade ??
    previewProduct?.nutriscore_grade ??
    (!previewHistoryProduct && !previewProduct
      ? successResult?.product.scores.nutriscore_grade ?? null
      : null);
  const nutriScoreGrade = isExpanded ? expandedNutriScoreGrade : previewNutriScoreGrade;

  if (!product) {
    return <DetailStateContent detailState={detailState} />;
  }

  return (
    <ScrollView
      scrollEnabled={isExpanded}
      showsVerticalScrollIndicator={isExpanded}
      className="flex-1"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      <View>
        <View className="px-4 pb-4">
          <ProductResultHeader
            product={product}
            previewImageUri={previewImageUri}
            productId={successResult?.productId}
            isFavourite={successResult?.isFavourite}
          />
          <NutriScoreBlock grade={nutriScoreGrade} />
        </View>
        <View className="relative">
          {hasSummaryContent ? (
            <Animated.View
              pointerEvents={isExpanded ? 'none' : 'auto'}
              className="absolute left-4 right-4 -top-4 z-10"
              style={{ opacity: summaryOpacity }}
            >
              <PreviewSummaryContent
                chips={previewChips}
                score={previewScore}
                showPendingSummary={showHistoryPendingSummary || showLivePendingSummary}
                context={profileScoreChipContext}
                isLoading={isInitialLoadingResult}
                showActions={!isInitialLoadingResult && !showLivePendingSummary}
                onExpandDetails={onExpandDetails}
              />
            </Animated.View>
          ) : null}
          <Animated.View
            pointerEvents={isExpanded ? 'auto' : 'none'}
            style={{ opacity: detailOpacity }}
          >
            {detailState?.isLoading || detailState?.isError ? (
              <DetailStateContent detailState={detailState} />
            ) : (
              <PersonalTabContent
                personalResult={personalData}
                isError={personalError}
                onRetry={personalRetry}
                rawIngredients={successResult?.product.ingredients ?? []}
                rawIngredientsText={successResult?.product.ingredients_text ?? null}
              />
            )}
          </Animated.View>
        </View>
      </View>
    </ScrollView>
  );
}
