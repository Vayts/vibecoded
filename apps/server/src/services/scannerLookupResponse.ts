import type {
  BarcodeLookupNotFoundResponse,
  BarcodeLookupProduct,
  BarcodeLookupSuccessResponse,
  ScannerLookupSource,
} from '@acme/shared';

import { buildProductAnalysisFallback } from './productAnalysisFallback';
import { createPersonalAnalysisJob } from './personalAnalysisJobs';
import { createScan, findProductIdByBarcode, findRecentScanByBarcode } from './scanRepository';

export const createScanNotFoundResponse = (
  lookupId: string,
  source: ScannerLookupSource,
): BarcodeLookupNotFoundResponse => {
  return {
    success: false,
    barcode: lookupId,
    source,
    error: 'PRODUCT_NOT_FOUND',
  };
};

export const createScanSuccessResponse = async (
  lookupId: string,
  source: ScannerLookupSource,
  product: BarcodeLookupProduct,
  userId?: string,
): Promise<BarcodeLookupSuccessResponse> => {
  const evaluation = buildProductAnalysisFallback(product);

  let scanId: string | undefined;
  if (userId) {
    const existing = await findRecentScanByBarcode(userId, product.code);
    if (existing) {
      scanId = existing.id;
    } else {
      const productId = await findProductIdByBarcode(product.code);
      const scan = await createScan({
        userId,
        productId: productId ?? undefined,
        barcode: product.code,
        source: source === 'openfoodfacts' ? 'barcode' : 'photo',
        overallScore: evaluation.overallScore,
        overallRating: evaluation.rating,
        personalAnalysisStatus: 'pending',
        evaluation,
      });
      scanId = scan.id;
    }
  }

  const personalAnalysis = createPersonalAnalysisJob(product, userId, scanId);

  return {
    success: true,
    barcode: lookupId,
    source,
    product,
    evaluation,
    personalAnalysis,
  };
};
