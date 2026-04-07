import { Hono } from 'hono';
import type { NormalizedProduct } from '@acme/shared';
import { auth } from '../lib/auth';
import { identifyProductByPhoto, extractTextFromPhoto } from '../services/photo-product-identification';
import { isFoodProduct } from '../services/is-food-product';
import { createProduct } from '../repositories/productRepository';
import { findProductIdByBarcode } from '../repositories/scanRepository';
import { isFavouriteByBarcode } from '../repositories/favoriteRepository';
import { buildSuccessResponse } from './scanner-helpers';
import { processProductImage } from '../lib/image-processing';
import { uploadProductImage } from '../lib/storage';

export const scannerPhotoRoute = new Hono();

const MAX_PHOTO_BASE64_SIZE = 10 * 1024 * 1024; // ~10MB base64 ≈ ~7.5MB binary

/**
 * POST /api/scanner/photo/ocr
 * Quick OCR-only pass: extract product name and brand from photo without full identification.
 */
scannerPhotoRoute.post('/photo/ocr', async (c) => {
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

  try {
    const ocr = await extractTextFromPhoto(imageBase64);

    if (!ocr) {
      return c.json({ error: 'Could not read text from photo', code: 'OCR_FAILED' }, 422);
    }

    if (!ocr.isFoodProduct) {
      return c.json(
        { error: 'Product does not appear to be a food item', code: 'NOT_FOOD' },
        422,
      );
    }

    return c.json({
      productName: ocr.productName,
      brand: ocr.brand,
      isFoodProduct: ocr.isFoodProduct,
    });
  } catch (error) {
    console.error('[photo-ocr] ❌ Error:', error);
    throw error;
  }
});

const attachPhotoImagePath = (
  product: NormalizedProduct,
  photoImagePath: string | null,
) : NormalizedProduct => {
  if (!product || !photoImagePath) {
    return product;
  }

  return {
    ...product,
    image_url: photoImagePath,
    images: {
      ...product.images,
      front_url: photoImagePath,
    },
  };
};

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
    console.log(`📸 [photo-route] 1/6 Received photo scan — user=${userId} base64len=${imageBase64.length}`);

    const identification = await identifyProductByPhoto(imageBase64);

    if (!identification) {
      console.log(`❌ [photo-route] AI identification returned null [${elapsed()}]`);
      return c.json(
        { error: 'Could not identify product from photo', code: 'PRODUCT_NOT_FOUND' },
        404,
      );
    }

    const product = identification.product;

    console.log(
      `[photo-route] 2/6 AI identified: "${product.product_name}" (${product.brands}) code=${product.code} source=${identification.source} shouldUploadPhoto=${identification.shouldUploadPhoto} [${elapsed()}]`,
    );

    if (!isFoodProduct(product)) {
      console.log(`❌ [photo-route] isFoodProduct check failed for "${product.product_name}" [${elapsed()}]`);
      return c.json(
        { error: 'Product does not appear to be a food item', code: 'PRODUCT_NOT_FOUND' },
        404,
      );
    }

    let savedProduct = product;
    let photoImagePath: string | null = null;

    if (identification.shouldUploadPhoto) {
      const rawBuffer = Buffer.from(imageBase64, 'base64');
      console.log(`📸 [photo-route] 3/6 Preparing image upload for new product — bytes=${rawBuffer.length} [${elapsed()}]`);

      try {
        const processed = await processProductImage(rawBuffer);
        console.log(`📸 [photo-route] Image processed: ${processed.width}x${processed.height} ${processed.sizeBytes} bytes [${elapsed()}]`);
        photoImagePath = await uploadProductImage(processed.buffer);
        console.log(`📸 [photo-route] Image uploaded: ${photoImagePath} [${elapsed()}]`);
      } catch (err) {
        console.error('📸 [photo-route] Image processing/upload failed for new product:', err);
        return c.json({ error: 'Failed to store product image', code: 'IMAGE_UPLOAD_FAILED' }, 502);
      }

      const productWithImage = attachPhotoImagePath(product, photoImagePath);
      console.log(
        `[photo-route] Product image attached image_url=${productWithImage.image_url ?? 'null'} front_url=${productWithImage.images.front_url ?? 'null'} [${elapsed()}]`,
      );

      console.log(`[photo-route] 4/6 New product identified — saving to DB... [${elapsed()}]`);
      savedProduct = await createProduct(productWithImage);
      console.log(`[photo-route] 5/6 Saved new product — building response + analysis job... [${elapsed()}]`);
    } else {
      console.log(`[photo-route] 3/6 Existing product matched — skipping image upload and product update [${elapsed()}]`);
      console.log(`[photo-route] 4/6 Reusing existing product data — building response + analysis job... [${elapsed()}]`);
    }

    const response = await buildSuccessResponse(
      savedProduct.code,
      'photo',
      savedProduct,
      userId,
      'photo',
      photoImagePath ?? undefined,
    );
    console.log(
      `[photo-route] 5/6 Response built barcode=${response.barcode} productName="${response.product.product_name ?? ''}" photoImagePath=${photoImagePath ?? 'null'} [${elapsed()}]`,
    );

    const [isFav, productId] = await Promise.all([
      isFavouriteByBarcode(userId, response.barcode),
      findProductIdByBarcode(response.barcode),
    ]);

    console.log(`✅ [photo-route] 6/6 Done — "${savedProduct.product_name}" isFav=${isFav} productId=${productId} [${elapsed()}]`);
    return c.json({
      ...response,
      isFavourite: isFav,
      productId: productId ?? undefined,
      photoImagePath: photoImagePath ?? undefined,
    });
  } catch (error) {
    console.error('[photo-route] ❌ Uncaught error:', error);
    throw error;
  }
});
