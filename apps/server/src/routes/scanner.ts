import { Hono } from 'hono';
import {
  barcodeLookupRequestSchema,
  personalAnalysisResultSchema,
  multiProfilePersonalAnalysisResultSchema,
  productLookupRequestSchema,
  compareProductsRequestSchema,
  type BarcodeLookupSuccessResponse,
  type BarcodeLookupNotFoundResponse,
  type ScannerLookupSource,
  type NormalizedProduct,
  type ProductPreview,
  type ProductComparisonResult,
} from '@acme/shared';
import { auth } from '../lib/auth';
import { lookupBarcode, OpenFoodFactsLookupError } from '../services/openfoodfacts-client';
import { searchProductByBarcode } from '../services/websearch-fallback';
import { isFoodProduct } from '../services/is-food-product';
import { createAnalysisJob, getAnalysisJob, createCachedAnalysisJob } from '../services/analysis-jobs';
import { compareProductsForProfiles } from '../services/comparison-ai';
import { findByBarcode, createProduct } from '../repositories/productRepository';
import {
  createScan,
  findRecentScanByBarcode,
  findProductIdByBarcode,
} from '../repositories/scanRepository';
import { isFavouriteByBarcode } from '../repositories/favoriteRepository';
import { getProfileInputs } from '../services/profileInputs';

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

/**
 * Resolve a product by barcode: DB → OpenFoodFacts → WebSearch → save.
 * Shared helper used by lookup and compare endpoints.
 */
const resolveProduct = async (
  barcode: string,
): Promise<{ product: NormalizedProduct; productId: string } | null> => {
  let product: NormalizedProduct | null = await findByBarcode(barcode);

  if (!product) {
    product = await lookupBarcode(barcode);
  }

  if (!product) {
    product = await searchProductByBarcode(barcode);
  }

  if (!product || !isFoodProduct(product)) {
    return null;
  }

  const saved = await createProduct(product);
  const productId = await findProductIdByBarcode(saved.code);
  return { product: saved, productId: productId! };
};

const toProductPreview = (product: NormalizedProduct, productId: string): ProductPreview => ({
  productId,
  barcode: product.code,
  product_name: product.product_name,
  brands: product.brands,
  image_url: product.image_url,
});

/**
 * POST /api/scanner/lookup
 * Lightweight product lookup — resolves by barcode without triggering analysis.
 */
scannerRoute.post('/lookup', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, 400);
  }

  const parsed = productLookupRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return c.json(
      { error: issue?.message ?? 'Invalid barcode payload', code: 'VALIDATION_ERROR' },
      400,
    );
  }

  const { barcode } = parsed.data;
  console.log(`🔍 [lookup] barcode=${barcode}`);
  const t0 = Date.now();

  try {
    const cached = await findByBarcode(barcode);
    if (cached) {
      console.log(`✅ [lookup] cache hit — "${cached.product_name}" (${Date.now() - t0}ms)`);
      const productId = await findProductIdByBarcode(barcode);
      return c.json({ success: true, product: toProductPreview(cached, productId!) });
    }

    console.log(`⬇️  [lookup] not in DB, fetching OpenFoodFacts…`);
    let product = await lookupBarcode(barcode);

    if (!product) {
      console.log(`⬇️  [lookup] OFF miss, trying web search fallback…`);
      product = await searchProductByBarcode(barcode);
    }

    if (!product || !isFoodProduct(product)) {
      console.log(`❌ [lookup] product not found or not food — barcode=${barcode} (${Date.now() - t0}ms)`);
      return c.json({ error: 'Product not found', code: 'PRODUCT_NOT_FOUND' }, 404);
    }

    const saved = await createProduct(product);
    const productId = await findProductIdByBarcode(saved.code);
    console.log(`✅ [lookup] resolved "${saved.product_name}" (${Date.now() - t0}ms)`);

    return c.json({
      success: true,
      product: toProductPreview(saved, productId!),
    });
  } catch (error) {
    if (error instanceof OpenFoodFactsLookupError) {
      console.log(`❌ [lookup] OpenFoodFacts error — ${error.code}: ${error.message}`);
      return c.json({ error: error.message, code: error.code }, 502);
    }
    throw error;
  }
});

/**
 * POST /api/scanner/compare
 * Compare two products for all user profiles using AI.
 */
scannerRoute.post('/compare', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, 400);
  }

  const parsed = compareProductsRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return c.json(
      { error: issue?.message ?? 'Invalid comparison payload', code: 'VALIDATION_ERROR' },
      400,
    );
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return c.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, 401);
  }

  try {
    const [resolved1, resolved2] = await Promise.all([
      resolveProduct(parsed.data.barcode1),
      resolveProduct(parsed.data.barcode2),
    ]);

    if (!resolved1) {
      return c.json({ error: 'First product not found', code: 'PRODUCT_NOT_FOUND' }, 404);
    }
    if (!resolved2) {
      return c.json({ error: 'Second product not found', code: 'PRODUCT_NOT_FOUND' }, 404);
    }

    const profiles = await getProfileInputs(userId);

    const comparisonResult = await compareProductsForProfiles(
      resolved1.product,
      resolved2.product,
      profiles,
    );

    const result: ProductComparisonResult = {
      product1: toProductPreview(resolved1.product, resolved1.productId),
      product2: toProductPreview(resolved2.product, resolved2.productId),
      profiles: comparisonResult,
    };

    return c.json(result);
  } catch (error) {
    if (error instanceof OpenFoodFactsLookupError) {
      return c.json({ error: error.message, code: error.code }, 502);
    }
    throw error;
  }
});
