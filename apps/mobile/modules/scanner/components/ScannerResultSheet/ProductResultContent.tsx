import type {
  AnalysisJobResponse,
  BarcodeLookupResponse,
  ProductPreview,
  ScanHistoryItem,
} from '@acme/shared';
import { useEffect, useRef, useState } from 'react';
import { Animated, type LayoutChangeEvent, View } from 'react-native';
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

const TRANSITION_DURATION_MS = 240;

interface ProductResultContentProps {
  previewItem?: ScanHistoryItem;
  result?: BarcodeLookupResponse;
  previewProduct?: ProductPreview;
  previewImageUri?: string | null;
  resolvedPersonalResult?: AnalysisJobResponse;
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
  const previewChips = previewItem?.type === 'product' ? previewItem.profileChips : undefined;
  const previewScore =
    previewItem?.type === 'product'
      ? previewItem.personalScore ?? previewItem.overallScore
      : null;
  const showPendingSummary =
    previewItem?.type === 'product' &&
    !previewChips?.length &&
    previewScore == null &&
    previewItem.personalAnalysisStatus === 'pending';
  const hasSummaryContent = Boolean(previewChips?.length || previewScore != null || showPendingSummary);
  const [summaryContentHeight, setSummaryContentHeight] = useState(0);
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

  const detailMarginTop = hasSummaryContent ? -summaryContentHeight : 0;
  const handleSummaryLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    const nextHeight = nativeEvent.layout.height;
    setSummaryContentHeight((currentHeight) => {
      if (Math.abs(currentHeight - nextHeight) < 1) {
        return currentHeight;
      }

      return nextHeight;
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
        <View className="px-4 pb-4">
          <ProductResultHeader
            product={product}
            previewImageUri={previewImageUri}
            productId={successResult?.productId}
            isFavourite={successResult?.isFavourite}
          />
          <NutriScoreBlock grade={nutriScoreGrade} />
          {previewItem?.type === 'product' && hasSummaryContent ? (
            <Animated.View
              pointerEvents={isExpanded ? 'none' : 'auto'}
              style={{ opacity: summaryOpacity }}
            >
              <PreviewSummaryContent
                chips={previewChips}
                score={previewScore}
                showPendingSummary={showPendingSummary}
                context={profileScoreChipContext}
                onLayout={handleSummaryLayout}
                onExpandDetails={onExpandDetails}
              />
            </Animated.View>
          ) : null}
        </View>
        <Animated.View
          pointerEvents={isExpanded ? 'auto' : 'none'}
          style={{
            marginTop: detailMarginTop,
            opacity: detailOpacity,
          }}
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
    </ScrollView>
  );
}
