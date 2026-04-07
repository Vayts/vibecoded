import {
  productAnalysisResultSchema,
  type BarcodeLookupNotFoundResponse,
  type BarcodeLookupSuccessResponse,
  type ComparisonProductPreview,
  type NormalizedProduct,
  type ProductPreview,
  type ScannerLookupSource,
} from '@acme/shared';
import {
  createAnalysisJob,
  createCachedAnalysisJob,
} from '../services/analysis-jobs';
import {
  createProduct,
  findByBarcode,
} from '../repositories/productRepository';
import {
  createScan,
  findRecentScanByBarcode,
  findProductIdByBarcode,
} from '../repositories/scanRepository';
import { lookupBarcode } from '../services/openfoodfacts-client';
import { searchProductByBarcode } from '../services/websearch-fallback';
import { isFoodProduct } from '../services/is-food-product';

export const RESULT_CACHE_MS = 2 * 60 * 60 * 1000;

export interface ResolvedProductResult {
  product: NormalizedProduct;
  productId: string;
  wasExistingInDb: boolean;
}

export const createNotFoundResponse = (
  barcode: string,
  source: ScannerLookupSource,
): BarcodeLookupNotFoundResponse => ({
  success: false,
  barcode,
  source,
  error: 'PRODUCT_NOT_FOUND',
});

export const buildSuccessResponse = async (
  barcode: string,
  source: ScannerLookupSource,
  product: NormalizedProduct,
  userId?: string,
  scanSource: 'barcode' | 'photo' = 'barcode',
  photoImagePath?: string,
): Promise<BarcodeLookupSuccessResponse> => {
  let scanId: string | undefined;

  if (userId) {
    const existing = await findRecentScanByBarcode(userId, barcode);

    if (existing) {
      scanId = existing.id;
      const scanAge = Date.now() - existing.createdAt.getTime();

      if (
        scanSource !== 'photo' &&
        scanAge < RESULT_CACHE_MS &&
        existing.personalAnalysisStatus === 'completed' &&
        existing.multiProfileResult
      ) {
        const parsed = productAnalysisResultSchema.safeParse(
          existing.multiProfileResult,
        );

        if (parsed.success) {
          return {
            success: true,
            barcode,
            source,
            product,
            personalAnalysis: createCachedAnalysisJob(parsed.data),
          };
        }
      }
    } else {
      const productId = await findProductIdByBarcode(product.code);
      const scan = await createScan({
        userId,
        productId: productId ?? undefined,
        barcode: product.code,
        source: scanSource,
        personalAnalysisStatus: 'pending',
        photoImagePath,
      });
      scanId = scan.id;
    }
  }

  return {
    success: true,
    barcode,
    source,
    product,
    personalAnalysis: createAnalysisJob(product, userId, scanId),
  };
};

export const resolveProduct = async (
  barcode: string,
): Promise<ResolvedProductResult | null> => {
  let product: NormalizedProduct | null = await findByBarcode(barcode);
  const wasExistingInDb = Boolean(product);

  if (!product) {
    try {
      product = await lookupBarcode(barcode);
    } catch {
      product = null;
    }
  }

  if (!product) {
    product = await searchProductByBarcode(barcode);
  }

  if (!product || !isFoodProduct(product)) {
    return null;
  }

  const savedProduct = await createProduct(product);
  const productId = await findProductIdByBarcode(savedProduct.code);

  return {
    product: savedProduct,
    productId: productId!,
    wasExistingInDb,
  };
};

export const toProductPreview = (
  product: NormalizedProduct,
  productId: string,
): ProductPreview => ({
  productId,
  barcode: product.code,
  product_name: product.product_name,
  brands: product.brands,
  image_url: product.image_url,
});

export const toComparisonProductPreview = (
  product: NormalizedProduct,
  productId: string,
): ComparisonProductPreview => ({
  ...toProductPreview(product, productId),
  nutrition: {
    calories: product.nutrition.energy_kcal_100g,
    protein: product.nutrition.proteins_100g,
    fat: product.nutrition.fat_100g,
    sugars: product.nutrition.sugars_100g,
    fiber: product.nutrition.fiber_100g,
    salt: product.nutrition.salt_100g,
    saturatedFat: product.nutrition.saturated_fat_100g,
    nutriscore_grade: product.scores.nutriscore_grade,
  },
});
