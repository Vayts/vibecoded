import type {
  BarcodeLookupResponse,
  PersonalAnalysisJob,
  ProductPreview,
  ScanHistoryItem,
} from '@acme/shared';
import { useEffect, useRef, useState } from 'react';
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
import { getProductImageUri } from './productResultHelpers';
import { getCompareSource, getPreviewHistoryProduct } from './productResultPreviewHelpers';

const DEFAULT_PROFILE_ID = 'you';

interface ProductResultContentProps {
  previewItem?: ScanHistoryItem;
  result?: BarcodeLookupResponse;
  scanId?: string;
  photoUri?: string;
  previewProduct?: ProductPreview;
  resolvedPersonalResult?: PersonalAnalysisJob;
  detailState?: ProductResultDetailState;
  onBeforeErrorSheetOpen?: () => void;
  onErrorSheetDismiss?: () => void;
}

export function ProductResultContent({
  previewItem,
  result,
  scanId,
  photoUri,
  previewProduct,
  resolvedPersonalResult,
  detailState,
  onBeforeErrorSheetOpen,
  onErrorSheetDismiss,
}: ProductResultContentProps) {
  const insets = useSafeAreaInsets();
  const [selectedProfileId, setSelectedProfileId] = useState<string>(DEFAULT_PROFILE_ID);
  const successResult = result && hasProductResult(result) ? result : undefined;
  const initialAnalysis = resolvedPersonalResult
    ? resolvedPersonalResult
    : successResult
      ? successResult.personalAnalysis
      : undefined;
  const personalQuery = usePersonalAnalysisQuery(initialAnalysis);
  const hasServerAnalysisId = Boolean(initialAnalysis?.analysisId);
  const personalData = hasServerAnalysisId
    ? (personalQuery.data ?? initialAnalysis)
    : initialAnalysis;
  const analysisProductPreview: ProductPreview | undefined = personalData?.result?.product
    ? {
        productId: '',
        barcode: '',
        product_name: personalData.result.product.name,
        product_name_english: personalData.result.product.englishName,
        brands: personalData.result.product.brand,
        image_url: personalData.result.product.imageUrl,
        nutriscore_grade: undefined,
      }
    : undefined;
  const hasHandledScannerErrorRef = useRef(false);
  const personalError =
    hasServerAnalysisId &&
    !personalData?.result &&
    (personalData?.status === 'failed' || personalQuery.isError);
  const personalRetry = () => {};
  const previewHistoryProduct = getPreviewHistoryProduct(previewItem);
  const resolvedScanId =
    scanId ??
    successResult?.scanId ??
    (previewItem?.type === 'product' ? previewItem.id : undefined);
  const nutriScoreGrade =
    successResult?.product.scores.nutriscore_grade ??
    previewProduct?.nutriscore_grade ??
    previewHistoryProduct?.nutriscore_grade ??
    null;
  const personalErrorCode = personalData?.error?.code;
  const isPersonalNotFood = personalErrorCode === 'NOT_FOOD';
  const isPersonalPackagingRequired = personalErrorCode === 'PACKAGED_PRODUCT_REQUIRED';

  useEffect(() => {
    if (
      (!isPersonalNotFood && !isPersonalPackagingRequired) ||
      hasHandledScannerErrorRef.current
    ) {
      return;
    }

    hasHandledScannerErrorRef.current = true;
    onBeforeErrorSheetOpen?.();

    void (async () => {
      await SheetManager.hide(SheetsEnum.ScannerResultSheet);
      await SheetManager.show(SheetsEnum.ScannerErrorSheet, {
        payload: {
          variant: isPersonalNotFood ? 'not-food' : 'packaging-required',
          title: isPersonalNotFood ? 'This is not a food product' : 'We need a packaged product',
          message: isPersonalNotFood
            ? 'The scanned item does not appear to be a food or drink product. Please scan a food item instead.'
            : 'Take a photo of a packaged food or drink with a visible label, ingredients, or nutrition facts panel.',
          onDismiss: onErrorSheetDismiss,
        },
      });
    })();
  }, [
    isPersonalNotFood,
    isPersonalPackagingRequired,
    onBeforeErrorSheetOpen,
    onErrorSheetDismiss,
  ]);

  if (result?.success === false) {
    return <NotFoundContent result={result} />;
  }

  const product =
    successResult?.product ?? analysisProductPreview ?? previewProduct ?? previewHistoryProduct;
  const resolvedProductId =
    successResult?.productId ?? previewProduct?.productId ?? previewHistoryProduct?.id;
  const resolvedIsFavourite =
    successResult?.isFavourite ??
    (previewItem?.type === 'product' ? previewItem.isFavourite : false) ??
    false;
  const compareSource = getCompareSource({
    product,
    photoUri,
    previewHistoryProduct,
    previewProduct,
    successResult,
  });
  const errorBottomAction = resolvedScanId ? <ScanDeleteAction scanId={resolvedScanId} /> : null;

  if (detailState?.isLoading) {
    return <DetailStateContent detailState={detailState} bottomAction={errorBottomAction} />;
  }

  if (!product) {
    return <DetailStateContent detailState={detailState} bottomAction={errorBottomAction} />;
  }

  const heroProduct =
    successResult?.product &&
    !getProductImageUri(successResult.product) &&
    previewProduct?.image_url
      ? { ...successResult.product, image_url: previewProduct.image_url }
      : product;

  const handleComparePress = () => {
    if (!compareSource?.barcode && !compareSource?.photoUri) {
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
          product={heroProduct}
          personalResult={personalData}
          selectedProfileId={selectedProfileId}
          onSelectProfile={setSelectedProfileId}
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
                isCompareDisabled={!compareSource?.barcode && !compareSource?.photoUri}
                onComparePress={handleComparePress}
              />
            }
            productId={resolvedProductId}
            personalResult={personalData}
            isError={personalError}
            onRetry={personalRetry}
            rawIngredients={
              successResult?.product.ingredients ?? personalData?.result?.product.ingredients ?? []
            }
            rawIngredientsText={successResult?.product.ingredients_text ?? null}
            selectedProfileId={selectedProfileId}
          />
        )}
      </View>
    </ScrollView>
  );
}
