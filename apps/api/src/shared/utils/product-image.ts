const NULL_LIKE_IMAGE_URLS = new Set(['', '/', '/null', 'null', 'n/a', 'none', 'undefined', '-']);
const STORAGE_IMAGE_PATH_PREFIXES = ['/products/', '/avatars/'];

export interface ProductImagesPayload {
  front_url: string | null;
  ingredients_url: string | null;
  nutrition_url: string | null;
}

interface ProductWithCanonicalImage {
  image_url: string | null;
  images: ProductImagesPayload;
}

type ProductImageKey = keyof ProductImagesPayload;

export const normalizeImageUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  const lowerCased = normalized.toLowerCase();

  if (!normalized) {
    return null;
  }

  if (NULL_LIKE_IMAGE_URLS.has(lowerCased)) {
    return null;
  }

  if (lowerCased.startsWith('http://') || lowerCased.startsWith('https://')) {
    return normalized;
  }

  return STORAGE_IMAGE_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))
    ? normalized
    : null;
};

export const getProductImageUrl = (images: unknown, key: ProductImageKey): string | null => {
  if (!images || typeof images !== 'object' || Array.isArray(images)) {
    return null;
  }

  const value = (images as Partial<Record<ProductImageKey, unknown>>)[key];
  return normalizeImageUrl(value);
};

export const getFrontImageUrl = (images: unknown): string | null =>
  getProductImageUrl(images, 'front_url');

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
