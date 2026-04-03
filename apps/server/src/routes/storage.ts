import { Hono } from 'hono';
import { getObjectStream } from '../lib/storage';

export const storageRoute = new Hono();

/**
 * GET /api/storage/products/:filename
 * Proxies product images from configured object storage. Only serves files from the `products/` prefix.
 */
storageRoute.get('/products/:filename', async (c) => {
  const filename = c.req.param('filename');

  // Sanitize: only allow alphanumeric, underscores, hyphens, dots
  if (!filename || !/^[\w\-]+\.\w+$/.test(filename)) {
    return c.json({ error: 'Invalid filename', code: 'VALIDATION_ERROR' }, 400);
  }

  try {
    const { stream, contentType, size } = await getObjectStream(`/products/${filename}`);

    c.header('Content-Type', contentType);
    c.header('Content-Length', String(size));
    c.header('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(stream as unknown as ReadableStream, {
      status: 200,
      headers: c.res.headers,
    });
  } catch (err: unknown) {
    const code = (err as { code?: string | number }).code;
    if (code === 'NoSuchKey' || code === 'NotFound' || code === '404' || code === 404) {
      return c.json({ error: 'Image not found', code: 'NOT_FOUND' }, 404);
    }
    console.error('[storage] Failed to serve image:', err);
    return c.json({ error: 'Failed to retrieve image', code: 'INTERNAL_ERROR' }, 500);
  }
});
