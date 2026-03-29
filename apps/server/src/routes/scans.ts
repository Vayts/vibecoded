import { Hono } from 'hono';
import type { ScanDetailResponse, ScanHistoryItem } from '@acme/shared';
import { auth } from '../lib/auth';
import { findScanById, findScansByUserId } from '../repositories/scanRepository';
import { normalizedProductSchema } from '@acme/shared';
import { productAnalysisResultSchema, personalAnalysisResultSchema, multiProfilePersonalAnalysisResultSchema, profileFitChipSchema } from '@acme/shared';
import { getFavouriteProductIds, isFavourite } from '../repositories/favoriteRepository';

export const scansRoute = new Hono();

scansRoute.get('/history', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.id) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }

  const cursor = c.req.query('cursor') || undefined;
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : undefined;

  const { items, nextCursor } = await findScansByUserId(session.user.id, cursor, limit);

  const productIds = items
    .map((s) => s.product?.id)
    .filter((id): id is string => id != null);
  const favouriteSet = await getFavouriteProductIds(session.user.id, productIds);

  const historyItems: ScanHistoryItem[] = items.map((scan) => {
    const personal = scan.personalResult as { fitScore?: number; fitLabel?: string } | null;

    let profileChips: ScanHistoryItem['profileChips'] = undefined;
    if (scan.multiProfileResult && typeof scan.multiProfileResult === 'object') {
      const multi = scan.multiProfileResult as { profiles?: unknown[] };
      if (Array.isArray(multi.profiles)) {
        const parsed = multi.profiles
          .map((p) => profileFitChipSchema.safeParse(p))
          .filter((r) => r.success)
          .map((r) => r.data!);
        if (parsed.length > 0) profileChips = parsed;
      }
    }

    return {
      id: scan.id,
      createdAt: scan.createdAt.toISOString(),
      source: scan.source,
      overallScore: scan.overallScore,
      overallRating: scan.overallRating,
      personalScore: personal?.fitScore ?? null,
      personalRating: (personal?.fitLabel as ScanHistoryItem['personalRating']) ?? null,
      personalAnalysisStatus: scan.personalAnalysisStatus,
      isFavourite: scan.product ? favouriteSet.has(scan.product.id) : false,
      profileChips,
      product: scan.product
        ? {
            id: scan.product.id,
            barcode: scan.product.barcode,
            product_name: scan.product.product_name,
            brands: scan.product.brands,
            image_url: scan.product.image_url,
          }
        : null,
    };
  });

  return c.json({ items: historyItems, nextCursor });
});

scansRoute.get('/:id', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.id) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }

  const scanId = c.req.param('id');
  const scan = await findScanById(scanId, session.user.id);

  if (!scan) {
    return c.json({ error: 'Scan not found', code: 'NOT_FOUND' }, 404);
  }

  let product = null;
  if (scan.product) {
    const parsed = normalizedProductSchema.safeParse({
      code: scan.product.code,
      product_name: scan.product.product_name,
      brands: scan.product.brands,
      image_url: scan.product.image_url,
      ingredients_text: scan.product.ingredients_text,
      nutriscore_grade: scan.product.nutriscore_grade,
      categories: scan.product.categories,
      quantity: scan.product.quantity,
      serving_size: scan.product.serving_size,
      ingredients: scan.product.ingredients,
      allergens: scan.product.allergens,
      additives: scan.product.additives,
      additives_count: scan.product.additives_count,
      traces: scan.product.traces,
      countries: scan.product.countries,
      category_tags: scan.product.category_tags,
      images: scan.product.images,
      nutrition: scan.product.nutrition,
      scores: scan.product.scores,
    });
    if (parsed.success) {
      product = parsed.data;
    }
  }

  let evaluation = null;
  if (scan.evaluation && scan.evaluation !== null) {
    const parsed = productAnalysisResultSchema.safeParse(scan.evaluation);
    if (parsed.success) {
      evaluation = parsed.data;
    }
  }

  let personalResult = null;
  if (scan.personalResult && scan.personalResult !== null) {
    const parsed = personalAnalysisResultSchema.safeParse(scan.personalResult);
    if (parsed.success) {
      personalResult = parsed.data;
    }
  }

  let multiProfileResult = null;
  if (scan.multiProfileResult && scan.multiProfileResult !== null) {
    const parsed = multiProfilePersonalAnalysisResultSchema.safeParse(scan.multiProfileResult);
    if (parsed.success) {
      multiProfileResult = parsed.data;
    }
  }

  const isFav = scan.productId
    ? await isFavourite(session.user.id, scan.productId)
    : false;

  const response: ScanDetailResponse = {
    id: scan.id,
    createdAt: scan.createdAt.toISOString(),
    source: scan.source,
    overallScore: scan.overallScore,
    overallRating: scan.overallRating,
    personalAnalysisStatus: scan.personalAnalysisStatus,
    barcode: scan.barcode,
    productId: scan.productId ?? null,
    isFavourite: isFav,
    product,
    evaluation,
    personalResult,
    multiProfileResult,
  };

  return c.json(response);
});
