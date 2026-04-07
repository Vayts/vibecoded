import { Hono } from 'hono';
import {
  barcodeLookupRequestSchema,
  productLookupRequestSchema,
  compareProductsRequestSchema,
  type ScannerLookupSource,
  type NormalizedProduct,
  type ProductComparisonResult,
} from '@acme/shared';
import { auth } from '../lib/auth';
import { lookupBarcode, OpenFoodFactsLookupError } from '../services/openfoodfacts-client';
import { searchProductByBarcode } from '../services/websearch-fallback';
import { isFoodProduct } from '../services/is-food-product';
import { getAnalysisJob } from '../services/analysis-jobs';
import { compareProductsForProfiles } from '../services/comparison-ai';
import { findByBarcode, createProduct } from '../repositories/productRepository';
import { findProductIdByBarcode } from '../repositories/scanRepository';
import { createComparison } from '../repositories/comparisonRepository';
import { isFavouriteByBarcode } from '../repositories/favoriteRepository';
import { getProfileInputs } from '../services/profileInputs';
import {
  buildSuccessResponse,
  createNotFoundResponse,
  resolveProduct,
  toProductPreview,
  toComparisonProductPreview,
} from './scanner-helpers';

export const scannerRoute = new Hono();

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

    // Step 2: Try OpenFoodFacts (with timeout — falls through to WebSearch on failure)
    if (!product) {
      try {
        product = await lookupBarcode(barcode);
      } catch (err) {
        if (err instanceof OpenFoodFactsLookupError) {
          console.warn(`[scanner] OFF lookup failed (${err.code}) for ${barcode}: ${err.message}`);
          // Fall through to WebSearch
        } else {
          throw err;
        }
      }
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
      product1: toComparisonProductPreview(resolved1.product, resolved1.productId),
      product2: toComparisonProductPreview(resolved2.product, resolved2.productId),
      profiles: comparisonResult,
    };

    // Save comparison to history
    await createComparison({
      userId,
      product1Id: resolved1.productId ?? undefined,
      product2Id: resolved2.productId ?? undefined,
      barcode1: parsed.data.barcode1,
      barcode2: parsed.data.barcode2,
      comparisonResult: result,
    });

    return c.json(result);
  } catch (error) {
    if (error instanceof OpenFoodFactsLookupError) {
      return c.json({ error: error.message, code: error.code }, 502);
    }
    throw error;
  }
});
