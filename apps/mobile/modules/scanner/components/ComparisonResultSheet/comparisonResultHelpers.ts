import type { ComparedProduct, ComparedProductCore } from '../../utils/profileCompareTypes';

export const getProductDisplayName = (product: ComparedProductCore): string => {
  const productName = product.name?.trim();

  if (productName) {
    return productName;
  }

  const brand = product.brand?.trim();
  if (brand) {
    return brand;
  }

  return 'Unknown product';
};

export const getComparedProductDisplayName = (product: ComparedProduct | null): string => {
  if (!product) return 'Unknown product';
  return getProductDisplayName(product.product);
};
