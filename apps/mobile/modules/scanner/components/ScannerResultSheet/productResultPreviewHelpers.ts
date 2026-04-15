import type {
  AnalysisJobResponse,
  BarcodeLookupProduct,
  BarcodeLookupResponse,
  ProductAnalysisResult,
  ProfileProductScore,
  ProductPreview,
  ScanHistoryItem,
} from '@acme/shared';

type BarcodeLookupSuccessResponse = Extract<BarcodeLookupResponse, { success: true }>;
type ProductAnalysisProfiles = ProductAnalysisResult['profiles'];
type ProductImageSource =
  | BarcodeLookupProduct
  | ProductPreview
  | NonNullable<ScanHistoryItem['product']>;

interface CompareSource {
  barcode: string;
  productId: string | null;
  productName: string | null;
}

interface PreviewSummaryState {
  hasHistorySummaryContent: boolean;
  hasLiveSummaryContent: boolean;
  hasSummaryContent: boolean;
  previewChips: NonNullable<ScanHistoryItem['profileChips']> | undefined;
  previewScore: number | null;
  showHistoryPendingSummary: boolean;
  showLivePendingSummary: boolean;
}

export const getPreviewHistoryProduct = (previewItem?: ScanHistoryItem) => {
  if (previewItem?.type !== 'product') {
    return null;
  }

  return previewItem.product;
};

export const getActiveProfile = (
  profiles: ProductAnalysisProfiles | undefined,
  selectedProfileId: string,
): ProfileProductScore | undefined => {
  if (!profiles?.length) {
    return undefined;
  }

  return (
    profiles.find((profile) => profile.profileId === selectedProfileId) ??
    profiles.find((profile) => profile.profileId === 'you') ??
    profiles[0]
  );
};

export const getPreviewSummaryState = ({
  previewItem,
  previewProduct,
  isInitialLoadingResult,
  personalStatus,
}: {
  previewItem?: ScanHistoryItem;
  previewProduct?: ProductPreview;
  isInitialLoadingResult: boolean;
  personalStatus?: AnalysisJobResponse['status'];
}): PreviewSummaryState => {
  const previewChips =
    previewItem?.type === 'product' ? previewItem.profileChips : undefined;
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
  const hasLiveSummaryContent = Boolean(previewProduct) && !previewItem;
  const showLivePendingSummary =
    hasLiveSummaryContent &&
    !isInitialLoadingResult &&
    personalStatus === 'pending';

  return {
    hasHistorySummaryContent,
    hasLiveSummaryContent,
    hasSummaryContent: hasHistorySummaryContent || hasLiveSummaryContent,
    previewChips,
    previewScore,
    showHistoryPendingSummary,
    showLivePendingSummary,
  };
};

export const getCompareSource = ({
  product,
  previewHistoryProduct,
  previewProduct,
  successResult,
}: {
  product: ProductImageSource | null | undefined;
  previewHistoryProduct: NonNullable<ScanHistoryItem['product']> | null;
  previewProduct?: ProductPreview;
  successResult?: BarcodeLookupSuccessResponse;
}): CompareSource | null => {
  if (!product) {
    return null;
  }

  return {
    barcode:
      successResult?.barcode ??
      previewProduct?.barcode ??
      previewHistoryProduct?.barcode ??
      '',
    productId:
      successResult?.productId ??
      (previewProduct?.productId?.trim() ? previewProduct.productId : null) ??
      previewHistoryProduct?.id ??
      null,
    productName: product.product_name ?? null,
  };
};

export const getDisplayedNutriScoreGrade = ({
  isExpanded,
  previewHistoryProduct,
  previewProduct,
  successResult,
}: {
  isExpanded: boolean;
  previewHistoryProduct: NonNullable<ScanHistoryItem['product']> | null;
  previewProduct?: ProductPreview;
  successResult?: BarcodeLookupSuccessResponse;
}) => {
  const expandedNutriScoreGrade =
    successResult?.product.scores.nutriscore_grade ??
    previewProduct?.nutriscore_grade ??
    previewHistoryProduct?.nutriscore_grade ??
    null;

  if (isExpanded) {
    return expandedNutriScoreGrade;
  }

  return (
    previewHistoryProduct?.nutriscore_grade ??
    previewProduct?.nutriscore_grade ??
    (!previewHistoryProduct && !previewProduct
      ? successResult?.product.scores.nutriscore_grade ?? null
      : null)
  );
};