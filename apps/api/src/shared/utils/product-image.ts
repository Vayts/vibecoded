import type { NormalizedProduct } from '@acme/shared';

const NULL_LIKE_IMAGE_URLS = new Set([
  '',
  '/',
  '/null',
  'null',
  'n/a',
  'none',
  'undefined',
  '-',
]);

export interface ProductImagesPayload {
  front_url: string | null;
  ingredients_url: string | null;
  nutrition_url: string | null;
}

interface ProductWithCanonicalImage {
  image_url: string | null;
  images: ProductImagesPayload;
}

export const normalizeImageUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  return NULL_LIKE_IMAGE_URLS.has(normalized.toLowerCase()) ? null : normalized;
};

export const getFrontImageUrl = (images: unknown): string | null => {
  if (!images || typeof images !== 'object' || Array.isArray(images)) {
    return null;
  }

  const frontUrl = (images as { front_url?: unknown }).front_url;
  return normalizeImageUrl(frontUrl);
};

export const resolveCanonicalProductImageUrl = (
  imageUrl: unknown,
  images?: unknown,
): string | null => {
  return getFrontImageUrl(images) ?? normalizeImageUrl(imageUrl);
};

export const withCanonicalProductImage = <T extends ProductWithCanonicalImage>(product: T): T => {
  const canonicalImageUrl = resolveCanonicalProductImageUrl(product.image_url, product.images);

  return {
    ...product,
    image_url: canonicalImageUrl,
    images: {
      ...product.images,
      front_url: canonicalImageUrl,
    },
  };
};

export const toCanonicalImageFields = (
  product: NormalizedProduct,
): Pick<NormalizedProduct, 'image_url' | 'images'> => {
  const canonicalProduct = withCanonicalProductImage(product);

  return {
    image_url: canonicalProduct.image_url,
    images: canonicalProduct.images,
  };
};

