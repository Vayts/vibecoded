import type { NormalizedProduct } from '@acme/shared';

export const attachPhotoImagePathV2 = (
  product: NormalizedProduct,
  photoImagePath: string | null,
): NormalizedProduct => {
  if (!photoImagePath) {
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
