import type { AnalysisJobResponse, BarcodeLookupResponse, ProductPreview, ScanHistoryItem } from '@acme/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';
import { usePersonalAnalysisQuery } from '../../api/scannerQueries';
import { DetailStateContent, type ProductResultDetailState } from './DetailStateContent';
import { hasProductResult } from './productResultHelpers';
import { NotFoundContent } from './NotFoundContent';
import { ScrollView } from 'react-native-actions-sheet';
import { PersonalTabContent } from './PersonalTabContent';
import { ProductResultBottomActions } from './ProductResultBottomActions';
import { ProductResultHero } from './ProductResultHero';
import { ScanDeleteAction } from './ScanDeleteAction';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetsEnum } from '../../../../shared/types/sheets';
import { getCompareSource, getPreviewHistoryProduct } from './productResultPreviewHelpers';

const DEFAULT_PROFILE_ID = 'you';

interface ProductResultContentProps {
  previewItem?: ScanHistoryItem;
  result?: BarcodeLookupResponse;
  scanId?: string;
  previewProduct?: ProductPreview;
  resolvedPersonalResult?: AnalysisJobResponse;
  detailState?: ProductResultDetailState;
}

export function ProductResultContent({
  previewItem,
  result,
  scanId,
  previewProduct,
  resolvedPersonalResult,
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
  const previewHistoryProduct = getPreviewHistoryProduct(previewItem);
  const resolvedScanId = scanId ?? successResult?.scanId ?? (previewItem?.type === 'product' ? previewItem.id : undefined);
  const nutriScoreGrade =
    successResult?.product.scores.nutriscore_grade ??
    previewProduct?.nutriscore_grade ??
    previewHistoryProduct?.nutriscore_grade ??
    null;

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
  const errorBottomAction = resolvedScanId ? <ScanDeleteAction scanId={resolvedScanId} /> : null;

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
      showsVerticalScrollIndicator
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      <View>
        <ProductResultHero
          nutriScoreGrade={nutriScoreGrade}
          product={product}
          analysisResult={personalData?.result}
          hasPreviewAllergenConflict={previewItem?.mainUserHasAllergenConflict}
        />
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
      </View>
    </ScrollView>
  );
}
