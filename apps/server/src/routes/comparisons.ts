import { Hono } from 'hono';
import type { ComparisonHistoryItem } from '@acme/shared';
import { productComparisonResultSchema } from '@acme/shared';
import { auth } from '../lib/auth';
import { findComparisonsByUserId, findComparisonById } from '../repositories/comparisonRepository';

export const comparisonsRoute = new Hono();

comparisonsRoute.get('/', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.id) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }

  const cursor = c.req.query('cursor') || undefined;
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : undefined;

  const { items, nextCursor } = await findComparisonsByUserId(session.user.id, cursor, limit);

  const historyItems: ComparisonHistoryItem[] = items.map((comparison) => ({
    id: comparison.id,
    createdAt: comparison.createdAt.toISOString(),
    product1: comparison.product1
      ? {
          id: comparison.product1.id,
          barcode: comparison.product1.barcode,
          product_name: comparison.product1.product_name,
          brands: comparison.product1.brands,
          image_url: comparison.product1.image_url,
        }
      : null,
    product2: comparison.product2
      ? {
          id: comparison.product2.id,
          barcode: comparison.product2.barcode,
          product_name: comparison.product2.product_name,
          brands: comparison.product2.brands,
          image_url: comparison.product2.image_url,
        }
      : null,
  }));

  return c.json({ items: historyItems, nextCursor });
});

comparisonsRoute.get('/:id', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.id) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }

  const comparisonId = c.req.param('id');
  const comparison = await findComparisonById(comparisonId, session.user.id);

  if (!comparison) {
    return c.json({ error: 'Comparison not found', code: 'NOT_FOUND' }, 404);
  }

  const parsedResult = productComparisonResultSchema.safeParse(comparison.comparisonResult);

  return c.json({
    id: comparison.id,
    createdAt: comparison.createdAt.toISOString(),
    comparisonResult: parsedResult.success ? parsedResult.data : null,
  });
});
