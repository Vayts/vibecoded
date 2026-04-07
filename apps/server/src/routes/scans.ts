import { Hono } from 'hono';
import type { ScanDetailResponse, ScanHistoryItem } from '@acme/shared';
import { auth } from '../lib/auth';
import { findScanById, findScansByUserId } from '../repositories/scanRepository';
import { normalizedProductSchema, productAnalysisResultSchema, productComparisonResultSchema, profileProductScoreSchema } from '@acme/shared';
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
    const raw = scan.personalResult as { profiles?: Array<{ score?: number; fitLabel?: string }> } | null;
    const firstProfile = raw?.profiles?.[0];
    const personalScore = firstProfile?.score ?? null;
    const personalRating = (firstProfile?.fitLabel ?? null) as ScanHistoryItem['personalRating'];

    let profileChips: ScanHistoryItem['profileChips'] = undefined;
    if (scan.multiProfileResult && typeof scan.multiProfileResult === 'object') {
      const multi = scan.multiProfileResult as { profiles?: unknown[] };
      if (Array.isArray(multi.profiles)) {
        const parsed = multi.profiles
          .map((p) => {
            const r = profileProductScoreSchema.safeParse(p);
            if (r.success) {
              return { profileId: r.data.profileId, name: r.data.name, score: r.data.score, fitLabel: r.data.fitLabel };
            }
            return null;
          })
          .filter((r): r is NonNullable<typeof r> => r != null);
        if (parsed.length > 0) profileChips = parsed;
      }
    }

    return {
      id: scan.id,
      type: scan.type,
      createdAt: scan.createdAt.toISOString(),
      source: scan.source,
      overallScore: scan.overallScore,
      overallRating: scan.overallRating,
      personalScore: personalScore ?? null,
      personalRating: personalRating ?? null,
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
      product2: scan.product2
        ? {
            id: scan.product2.id,
            barcode: scan.product2.barcode,
            product_name: scan.product2.product_name,
            brands: scan.product2.brands,
            image_url: scan.product2.image_url,
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

  let analysisResult = null;
  if (scan.personalResult && scan.personalResult !== null) {
    const parsed = productAnalysisResultSchema.safeParse(scan.personalResult);
    if (parsed.success) {
      analysisResult = parsed.data;
    }
  }

  let comparisonResult = null;
  if (scan.type === 'comparison' && scan.comparisonResult) {
    const parsedComparison = productComparisonResultSchema.safeParse(scan.comparisonResult);
    if (parsedComparison.success) {
      comparisonResult = parsedComparison.data;
    }
  }

  const isFav = scan.productId
    ? await isFavourite(session.user.id, scan.productId)
    : false;

  const response: ScanDetailResponse = {
    id: scan.id,
    type: scan.type,
    createdAt: scan.createdAt.toISOString(),
    source: scan.source,
    overallScore: scan.overallScore,
    overallRating: scan.overallRating,
    personalAnalysisStatus: scan.personalAnalysisStatus,
    barcode: scan.barcode,
    productId: scan.productId ?? null,
    isFavourite: isFav,
    product,
    analysisResult,
    comparisonResult,
  };

  return c.json(response);
});
