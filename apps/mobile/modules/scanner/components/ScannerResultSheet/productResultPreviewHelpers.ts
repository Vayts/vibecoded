import type {
  BarcodeLookupProduct,
  BarcodeLookupResponse,
  ProfileProductScore,
  ProductPreview,
  ScanHistoryItem,
} from '@acme/shared';

type BarcodeLookupSuccessResponse = Extract<BarcodeLookupResponse, { success: true }>;
type ProductImageSource =
  | BarcodeLookupProduct
  | ProductPreview
  | NonNullable<ScanHistoryItem['product']>;

interface CompareSource {
  barcode: string;
  productId: string | null;
  productName: string | null;
}

export const getPreviewHistoryProduct = (previewItem?: ScanHistoryItem) => {
  if (previewItem?.type !== 'product') {
    return null;
  }

  return previewItem.product;
};

export const getActiveProfile = (
  profiles: ProfileProductScore[] | undefined,
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
