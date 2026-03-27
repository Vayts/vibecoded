import { Hono } from 'hono';
import type { FavouriteItem } from '@acme/shared';
import { addFavouriteRequestSchema } from '@acme/shared';
import { auth } from '../lib/auth';
import {
  addFavourite,
  removeFavourite,
  findFavouritesByUserId,
  findLatestScansForProducts,
  isFavourite,
} from '../services/favoriteRepository';

export const favouritesRoute = new Hono();

favouritesRoute.get('/', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.id) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }

  const cursor = c.req.query('cursor') || undefined;
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : undefined;

  const { items: favourites, nextCursor } = await findFavouritesByUserId(
    session.user.id,
    cursor,
    limit,
  );

  const productIds = favourites
    .map((f) => f.product?.id)
    .filter((id): id is string => id != null);

  const scanMap = await findLatestScansForProducts(session.user.id, productIds);

  const items: FavouriteItem[] = favourites.map((fav) => {
    const scan = fav.product ? scanMap.get(fav.product.id) : undefined;
    const personal = scan?.personalResult as { fitScore?: number; fitLabel?: string } | null;

    return {
      favouriteId: fav.id,
      id: scan?.id ?? fav.id,
      createdAt: (scan?.createdAt ?? fav.createdAt).toISOString(),
      source: (scan?.source as 'barcode' | 'photo') ?? 'barcode',
      overallScore: scan?.overallScore ?? null,
      overallRating: scan?.overallRating ?? null,
      personalScore: personal?.fitScore ?? null,
      personalRating: (personal?.fitLabel as FavouriteItem['personalRating']) ?? null,
      personalAnalysisStatus:
        (scan?.personalAnalysisStatus as FavouriteItem['personalAnalysisStatus']) ?? null,
      isFavourite: true,
      product: fav.product
        ? {
            id: fav.product.id,
            barcode: fav.product.barcode,
            product_name: fav.product.product_name,
            brands: fav.product.brands,
            image_url: fav.product.image_url,
          }
        : null,
    };
  });

  return c.json({ items, nextCursor });
});

favouritesRoute.post('/', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.id) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, 400);
  }

  const parsed = addFavouriteRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return c.json(
      { error: issue?.message ?? 'Invalid payload', code: 'VALIDATION_ERROR' },
      400,
    );
  }

  await addFavourite(session.user.id, parsed.data.productId);
  return c.json({ success: true });
});

favouritesRoute.delete('/:productId', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.id) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }

  const productId = c.req.param('productId');
  await removeFavourite(session.user.id, productId);
  return c.json({ success: true });
});

favouritesRoute.get('/status/:productId', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.id) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }

  const productId = c.req.param('productId');
  const favoured = await isFavourite(session.user.id, productId);
  return c.json({ isFavourite: favoured });
});
