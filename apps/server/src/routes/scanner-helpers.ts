import {
  productAnalysisResultSchema,
  type BarcodeLookupSuccessResponse,
  type BarcodeLookupNotFoundResponse,
  type ScannerLookupSource,
  type NormalizedProduct,
  type ProductPreview,
} from '@acme/shared';
import { createAnalysisJob, createCachedAnalysisJob } from '../services/analysis-jobs';
import { findByBarcode, createProduct } from '../repositories/productRepository';
import {
  createScan,
  findRecentScanByBarcode,
  findProductIdByBarcode,
} from '../repositories/scanRepository';
import { lookupBarcode } from '../services/openfoodfacts-client';
import { searchProductByBarcode } from '../services/websearch-fallback';
import { isFoodProduct } from '../services/is-food-product';

export const RESULT_CACHE_MS = 2 * 60 * 60 * 1000; // 2 hours

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
        const parsed = productAnalysisResultSchema.safeParse(existing.multiProfileResult);
        if (parsed.success) {
          const personalAnalysis = createCachedAnalysisJob(parsed.data);
          return { success: true, barcode, source, product, personalAnalysis };
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

  const personalAnalysis = createAnalysisJob(product, userId, scanId);

  return { success: true, barcode, source, product, personalAnalysis };
};

/**
 * Resolve a product by barcode: DB → OpenFoodFacts (6s timeout) → WebSearch → save.
 */
export const resolveProduct = async (
  barcode: string,
): Promise<ResolvedProductResult | null> => {
  let product: NormalizedProduct | null = await findByBarcode(barcode);
  const wasExistingInDb = Boolean(product);

  if (!product) {
    try {
      product = await lookupBarcode(barcode);
    } catch {
      // OFF timeout/error — fall through to WebSearch
    }
  }

  if (!product) {
    product = await searchProductByBarcode(barcode);
  }

  if (!product || !isFoodProduct(product)) {
    return null;
  }

  const saved = await createProduct(product);
  const productId = await findProductIdByBarcode(saved.code);
  return { product: saved, productId: productId!, wasExistingInDb };
};

export const toProductPreview = (product: NormalizedProduct, productId: string): ProductPreview => ({
  productId,
  barcode: product.code,
  product_name: product.product_name,
  brands: product.brands,
  image_url: product.image_url,
});
