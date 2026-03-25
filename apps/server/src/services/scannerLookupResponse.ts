import type {
  BarcodeLookupNotFoundResponse,
  BarcodeLookupProduct,
  BarcodeLookupSuccessResponse,
  ScannerLookupSource,
} from '@acme/shared';

import { buildProductAnalysisFallback } from './productAnalysisFallback';
import { createPersonalAnalysisJob } from './personalAnalysisJobs';

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

export const createScanSuccessResponse = (
  lookupId: string,
  source: ScannerLookupSource,
  product: BarcodeLookupProduct,
  userId?: string,
): BarcodeLookupSuccessResponse => {
  return {
    success: true,
    barcode: lookupId,
    source,
    product,
    evaluation: buildProductAnalysisFallback(product),
    personalAnalysis: createPersonalAnalysisJob(product, userId),
  };
};