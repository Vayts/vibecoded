import type {
  BarcodeLookupNotFoundResponse,
  BarcodeLookupProduct,
  BarcodeLookupSuccessResponse,
  MultiProfilePersonalAnalysisResult,
  PersonalAnalysisResult,
  ScannerLookupSource,
} from '@acme/shared';
import { multiProfilePersonalAnalysisResultSchema, personalAnalysisResultSchema } from '@acme/shared';

import { buildProductAnalysisFallback } from './productAnalysisFallback';
import { createPersonalAnalysisJob, createCachedPersonalAnalysisJob } from './personalAnalysisJobs';
import { createScan, findProductIdByBarcode, findRecentScanByBarcode } from './scanRepository';

const RESULT_CACHE_MS = 2 * 60 * 60 * 1000; // 2 hours

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
  let cachedPersonalResult: PersonalAnalysisResult | undefined;
  let cachedMultiProfileResult: MultiProfilePersonalAnalysisResult | undefined;

  if (userId) {
    // 4h window: don't create a new scan for the same product
    const existing = await findRecentScanByBarcode(userId, product.code);
    if (existing) {
      scanId = existing.id;

      // 2h window: reuse cached personal analysis result
      const scanAge = Date.now() - existing.createdAt.getTime();
      if (
        scanAge < RESULT_CACHE_MS &&
        existing.personalAnalysisStatus === 'completed' &&
        existing.personalResult
      ) {
        const parsed = personalAnalysisResultSchema.safeParse(existing.personalResult);
        if (parsed.success) {
          cachedPersonalResult = parsed.data;
        }
        // Also restore multi-profile result (includes family members)
        if (existing.multiProfileResult) {
          const multiParsed = multiProfilePersonalAnalysisResultSchema.safeParse(
            existing.multiProfileResult,
          );
          if (multiParsed.success) {
            cachedMultiProfileResult = multiParsed.data;
          }
        }
      }
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

  const personalAnalysis = cachedPersonalResult
    ? createCachedPersonalAnalysisJob(cachedPersonalResult, cachedMultiProfileResult)
    : createPersonalAnalysisJob(product, userId, scanId);

  return {
    success: true,
    barcode: lookupId,
    source,
    product,
    evaluation,
    personalAnalysis,
  };
};
