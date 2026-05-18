import {
  analyzeNormalizedProductForUser,
  getOrAnalyzeProductByBarcode,
  type AnalyzedProductByBarcodeResult,
} from './analyze-barcode.node.js';
import { findReusableAnalyzedProductByBarcode } from './analyze-barcode/cache-reuse.js';
import type { CompareProductV2Source } from '../../types/analyze-product-v2.types.js';
import { resolvePhotoProductV2Context } from '../../services/photo-product-identification.service.js';
import { normalizeOpenFoodFactsProduct } from '../../utils/normalize-open-food-facts-product.util.js';

interface CompareProductsNodeState {
  productA: CompareProductV2Source;
  productB: CompareProductV2Source;
  userId: string;
}

const getOrAnalyzeProductByPhoto = async (
  source: Extract<CompareProductV2Source, { type: 'photo' }>,
  userId: string,
): Promise<AnalyzedProductByBarcodeResult> => {
  const resolvedContext = await resolvePhotoProductV2Context({
    imageBase64: source.imageBase64,
    userId,
    ocr: source.ocr,
  });
  const barcode = resolvedContext.product.code;
  const reusableProduct = await findReusableAnalyzedProductByBarcode({ barcode, userId });

  if (reusableProduct) {
    return {
      ...reusableProduct,
      ...(resolvedContext.productId ? { productId: resolvedContext.productId } : {}),
    };
  }

  const product = normalizeOpenFoodFactsProduct(barcode, resolvedContext.product);
  const result = await analyzeNormalizedProductForUser({
    product,
    userId,
    logContext: `compare photo code=${barcode}`,
  });

  return {
    barcode,
    result,
    reusedExistingAnalysis: false,
    ...(resolvedContext.productId ? { productId: resolvedContext.productId } : {}),
  };
};

const getOrAnalyzeCompareProduct = (
  source: CompareProductV2Source,
  userId: string,
): Promise<AnalyzedProductByBarcodeResult> => {
  if (source.type === 'barcode') {
    return getOrAnalyzeProductByBarcode({ barcode: source.barcode, userId });
  }

  return getOrAnalyzeProductByPhoto(source, userId);
};

export async function compareProductsNode(
  state: CompareProductsNodeState,
): Promise<{ products: AnalyzedProductByBarcodeResult[] }> {
  const [productA, productB] = await Promise.all([
    getOrAnalyzeCompareProduct(state.productA, state.userId),
    getOrAnalyzeCompareProduct(state.productB, state.userId),
  ]);

  return {
    products: [productA, productB],
  };
}
