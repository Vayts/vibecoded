import { normalizeOpenFoodFactsProduct } from '../../utils/normalize-open-food-facts-product.util.js';
import type { AnalyzeBarcodeV2Response } from '../../types/analyze-product-v2.types.js';
import { ApiError } from '../../../../shared/errors/api-error.js';
import { validateAndNormalizeAiResult } from './analyze-barcode/ai-normalization.js';
import {
  analyzeAdviceWithAI,
  analyzeCoreWithAI,
  analyzeTracesWithAI,
  mergeAdviceIntoValidatedAiResult,
  mergeCoreAndTraceOutputs,
} from './analyze-barcode/ai-passes.js';
import { loadProductAnalyzeProfileContext } from './analyze-barcode/profile-context.js';
import { buildAnalyzeBarcodeResponse } from './analyze-barcode/response-assembly.js';
import { findReusableAnalyzedProductByBarcode as findReusableAnalyzedProductByBarcodeFromCache } from './analyze-barcode/cache-reuse.js';
import { resolveBarcodeProductContext } from '../../utils/resolve-barcode-product.util.js';
import {
  createProductAnalyzeV2Logger,
  formatLogContext,
} from '../../utils/product-analyze-v2-logger.util.js';

const logger = createProductAnalyzeV2Logger('barcode');

export interface AnalyzedProductByBarcodeResult {
  barcode: string;
  result: AnalyzeBarcodeV2Response;
  reusedExistingAnalysis: boolean;
  productId?: string;
  scanId?: string;
}

interface AnalyzeBarcodeNodeState {
  barcode: string;
  userId: string;
}

export async function analyzeNormalizedProductForUser(input: {
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>;
  userId: string;
  logContext?: string;
}): Promise<AnalyzeBarcodeV2Response> {
  const { product, userId } = input;
  const logContext = input.logContext ?? `barcode=${product.barcode}`;

  const profileContext = await loadProductAnalyzeProfileContext(userId);
  const { allProfiles } = profileContext;

  logger.log(
    `Running analysis ${formatLogContext({
      context: logContext,
      familyEnabled: profileContext.familyEnabled,
      profileCount: allProfiles.length,
      mainAllergyCount: profileContext.mainProfile.allergies.length,
      mainRestrictionCount: profileContext.mainProfile.restrictions.length,
    })}`,
  );

  const [rawCoreAiOutput, rawTraceAuditOutput] = await Promise.all([
    analyzeCoreWithAI(product, allProfiles),
    analyzeTracesWithAI(product, allProfiles),
  ]);
  const provisionalAiResult = validateAndNormalizeAiResult(
    mergeCoreAndTraceOutputs(rawCoreAiOutput, rawTraceAuditOutput),
    allProfiles,
    product,
  );

  if (!provisionalAiResult.product.isFoodProduct) {
    logger.warn(
      `Product rejected by food detection ${formatLogContext({
        context: logContext,
        evidenceCount: provisionalAiResult.product.evidence.length,
      })}`,
    );
    throw ApiError.unprocessable('This product does not appear to be a food item', 'NOT_FOOD');
  }

  const rawAdviceOutput = await analyzeAdviceWithAI(product, allProfiles, provisionalAiResult);
  const aiResult = mergeAdviceIntoValidatedAiResult(provisionalAiResult, rawAdviceOutput);
  const assembly = buildAnalyzeBarcodeResponse({ product, profiles: allProfiles, aiResult });

  logger.log(
    `Analysis completed ${formatLogContext({
      context: logContext,
      role: assembly.roleResult.value,
      roleSource: assembly.roleResult.source,
      nutritionScore: assembly.nutritionScore,
      profileCount: assembly.response.profiles.length,
    })}`,
  );

  return assembly.response;
}

export async function findReusableAnalyzedProductByBarcode(input: {
  barcode: string;
  userId: string;
}): Promise<AnalyzedProductByBarcodeResult | null> {
  return findReusableAnalyzedProductByBarcodeFromCache(input);
}

async function analyzeFreshProductByBarcode(input: {
  barcode: string;
  userId: string;
}): Promise<AnalyzedProductByBarcodeResult> {
  const { barcode, userId } = input;

  logger.log(`Starting barcode analysis ${formatLogContext({ barcode })}`);

  const resolvedProduct = await resolveBarcodeProductContext({ barcode });
  const product = resolvedProduct.product;
  logger.log(
    `Product resolved ${formatLogContext({
      barcode,
      source: resolvedProduct.source,
      hasName: Boolean(product.name),
      hasProductId: Boolean(resolvedProduct.productId),
    })}`,
  );
  const result = await analyzeNormalizedProductForUser({
    product,
    userId,
    logContext: `barcode=${barcode}`,
  });

  return {
    barcode,
    result,
    reusedExistingAnalysis: false,
    ...(resolvedProduct.productId ? { productId: resolvedProduct.productId } : {}),
  };
}

export async function getOrAnalyzeProductByBarcode(input: {
  barcode: string;
  userId: string;
}): Promise<AnalyzedProductByBarcodeResult> {
  const reusableProduct = await findReusableAnalyzedProductByBarcode(input);

  if (reusableProduct) {
    return reusableProduct;
  }

  return analyzeFreshProductByBarcode(input);
}

export async function analyzeBarcodeNode(state: AnalyzeBarcodeNodeState): Promise<{
  result: AnalyzeBarcodeV2Response;
  analyzedProduct: AnalyzedProductByBarcodeResult;
}> {
  const analyzedProduct = await getOrAnalyzeProductByBarcode({
    barcode: state.barcode,
    userId: state.userId,
  });

  return { result: analyzedProduct.result, analyzedProduct };
}
