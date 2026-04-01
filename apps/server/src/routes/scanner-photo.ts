import { Hono } from 'hono';
import { auth } from '../lib/auth';
import { identifyProductByPhoto } from '../services/photo-product-identification';
import { isFoodProduct } from '../services/is-food-product';
import { createProduct } from '../repositories/productRepository';
import { findProductIdByBarcode } from '../repositories/scanRepository';
import { isFavouriteByBarcode } from '../repositories/favoriteRepository';
import { buildSuccessResponse } from './scanner-helpers';

export const scannerPhotoRoute = new Hono();

const MAX_PHOTO_BASE64_SIZE = 10 * 1024 * 1024; // ~10MB base64 ≈ ~7.5MB binary

/**
 * POST /api/scanner/photo
 * Photo-based product identification: AI vision + WebSearch → normalize → same analysis pipeline
 */
scannerPhotoRoute.post('/photo', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, 400);
  }

  const imageBase64 = (body as { imageBase64?: string }).imageBase64;
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return c.json({ error: 'imageBase64 field is required', code: 'VALIDATION_ERROR' }, 400);
  }

  if (imageBase64.length > MAX_PHOTO_BASE64_SIZE) {
    return c.json({ error: 'Image too large', code: 'VALIDATION_ERROR' }, 400);
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const userId = session?.user?.id;

  if (!userId) {
    return c.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, 401);
  }

  try {
    console.log(`📸 [photo] Starting photo identification for user=${userId}`);
    const t0 = Date.now();
    const elapsed = () => `${Date.now() - t0}ms`;
    console.log(`📸 [photo-route] 1/5 Received photo scan — user=${userId} base64len=${imageBase64.length}`);

    const product = await identifyProductByPhoto(imageBase64);

    if (!product) {
      console.log(`❌ [photo-route] AI identification returned null [${elapsed()}]`);
      return c.json(
        { error: 'Could not identify product from photo', code: 'PRODUCT_NOT_FOUND' },
        404,
      );
    }

    console.log(`[photo-route] 2/5 AI identified: "${product.product_name}" (${product.brands}) code=${product.code} [${elapsed()}]`);

    if (!isFoodProduct(product)) {
      console.log(`❌ [photo-route] isFoodProduct check failed for "${product.product_name}" [${elapsed()}]`);
      return c.json(
        { error: 'Product does not appear to be a food item', code: 'PRODUCT_NOT_FOUND' },
        404,
      );
    }

    console.log(`[photo-route] 3/5 Food product confirmed — saving to DB... [${elapsed()}]`);
    const savedProduct = await createProduct(product);
    console.log(`[photo-route] 4/5 Saved product — building response + analysis job... [${elapsed()}]`);

    const response = await buildSuccessResponse(
      savedProduct.code,
      'photo',
      savedProduct,
      userId,
      'photo',
    );

    const [isFav, productId] = await Promise.all([
      isFavouriteByBarcode(userId, response.barcode),
      findProductIdByBarcode(response.barcode),
    ]);

    console.log(`✅ [photo-route] 5/5 Done — "${product.product_name}" isFav=${isFav} productId=${productId} [${elapsed()}]`);
    return c.json({ ...response, isFavourite: isFav, productId: productId ?? undefined });
  } catch (error) {
    console.error('[photo-route] ❌ Uncaught error:', error);
    throw error;
  }
});
