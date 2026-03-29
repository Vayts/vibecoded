import { Hono } from 'hono';
import {
  barcodeLookupRequestSchema,
  personalAnalysisResultSchema,
  multiProfilePersonalAnalysisResultSchema,
  type BarcodeLookupSuccessResponse,
  type BarcodeLookupNotFoundResponse,
  type ScannerLookupSource,
  type NormalizedProduct,
} from '@acme/shared';
import { auth } from '../lib/auth';
import { lookupBarcode, OpenFoodFactsLookupError } from '../services/openfoodfacts-client';
import { searchProductByBarcode } from '../services/websearch-fallback';
import { isFoodProduct } from '../services/is-food-product';
import { createAnalysisJob, getAnalysisJob, createCachedAnalysisJob } from '../services/analysis-jobs';
import { findByBarcode, createProduct } from '../repositories/productRepository';
import {
  createScan,
  findRecentScanByBarcode,
  findProductIdByBarcode,
} from '../repositories/scanRepository';
import { isFavouriteByBarcode } from '../repositories/favoriteRepository';

export const scannerRoute = new Hono();

const RESULT_CACHE_MS = 2 * 60 * 60 * 1000; // 2 hours

const createNotFoundResponse = (
  barcode: string,
  source: ScannerLookupSource,
): BarcodeLookupNotFoundResponse => ({
  success: false,
  barcode,
  source,
  error: 'PRODUCT_NOT_FOUND',
});

const buildSuccessResponse = async (
  barcode: string,
  source: ScannerLookupSource,
  product: NormalizedProduct,
  userId?: string,
): Promise<BarcodeLookupSuccessResponse> => {
  let scanId: string | undefined;

  if (userId) {
    const existing = await findRecentScanByBarcode(userId, barcode);
    if (existing) {
      scanId = existing.id;

      const scanAge = Date.now() - existing.createdAt.getTime();
      if (
        scanAge < RESULT_CACHE_MS &&
        existing.personalAnalysisStatus === 'completed' &&
        existing.personalResult
      ) {
        const parsed = personalAnalysisResultSchema.safeParse(existing.personalResult);
        if (parsed.success) {
          let cachedMultiProfile;
          if (existing.multiProfileResult) {
            const multiParsed = multiProfilePersonalAnalysisResultSchema.safeParse(
              existing.multiProfileResult,
            );
            if (multiParsed.success) {
              cachedMultiProfile = multiParsed.data;
            }
          }
          const personalAnalysis = createCachedAnalysisJob(parsed.data, cachedMultiProfile);
          return { success: true, barcode, source, product, personalAnalysis };
        }
      }
    } else {
      const productId = await findProductIdByBarcode(product.code);
      const scan = await createScan({
        userId,
        productId: productId ?? undefined,
        barcode: product.code,
        source: 'barcode',
        personalAnalysisStatus: 'pending',
      });
      scanId = scan.id;
    }
  }

  const personalAnalysis = createAnalysisJob(product, userId, scanId);

  return { success: true, barcode, source, product, personalAnalysis };
};

/**
 * POST /api/scanner/barcode
 * Scan flow: OpenFoodFacts → WebSearch fallback → normalize → return product + start AI analysis
 */
scannerRoute.post('/barcode', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, 400);
  }

  const parsed = barcodeLookupRequestSchema.safeParse(body);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return c.json(
      { error: issue?.message ?? 'Invalid barcode payload', code: 'VALIDATION_ERROR' },
      400,
    );
  }

  const barcode = parsed.data.barcode;

  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const userId = session?.user?.id;

    // Step 1: Check product cache
    let product: NormalizedProduct | null = await findByBarcode(barcode);
    let source: ScannerLookupSource = 'openfoodfacts';

    // Step 2: Try OpenFoodFacts
    if (!product) {
      product = await lookupBarcode(barcode);
    }

    // Step 3: Fallback to WebSearch
    if (!product) {
      product = await searchProductByBarcode(barcode);
      if (product) {
        source = 'websearch';
      }
    }

    // Step 4: Not found
    if (!product) {
      return c.json(createNotFoundResponse(barcode, source));
    }

    // Step 5: Validate it's a food product
    if (!isFoodProduct(product)) {
      return c.json(createNotFoundResponse(barcode, source));
    }

    // Step 6: Persist product
    const savedProduct = await createProduct(product);

    // Step 7: Build response + trigger async AI analysis
    const response = await buildSuccessResponse(barcode, source, savedProduct, userId);

    if (userId) {
      const [isFav, productId] = await Promise.all([
        isFavouriteByBarcode(userId, response.barcode),
        findProductIdByBarcode(response.barcode),
      ]);
      return c.json({ ...response, isFavourite: isFav, productId: productId ?? undefined });
    }

    const productId = await findProductIdByBarcode(response.barcode);
    return c.json({ ...response, productId: productId ?? undefined });
  } catch (error) {
    if (error instanceof OpenFoodFactsLookupError) {
      return c.json({ error: error.message, code: error.code }, 502);
    }

    throw error;
  }
});

/**
 * GET /api/scanner/personal-analysis/:jobId
 * Poll analysis job status (personal + ingredient analysis)
 */
scannerRoute.get('/personal-analysis/:jobId', (c) => {
  const jobId = c.req.param('jobId');
  const job = getAnalysisJob(jobId);

  if (!job) {
    return c.json({ error: 'Analysis job not found', code: 'NOT_FOUND' }, 404);
  }

  return c.json(job);
});
