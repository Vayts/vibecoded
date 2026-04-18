import type {
  ComparisonProductKey,
  ComparisonProductPreview,
  ProductComparisonResult,
  ProfileComparisonResult,
} from '@acme/shared';

export type ComparisonOutcomeState = 'best-choice' | 'close-match' | 'neutral' | 'no-match';

export const getProductDisplayName = (product: ComparisonProductPreview): string => {
  const productName = product.product_name?.trim();
  if (productName) {
    return productName;
  }

  const brand = product.brands?.trim();
  if (brand) {
    return brand;
  }

  return 'Unknown product';
};

export const getBestProductKey = (
  profile: ProfileComparisonResult,
  result: ProductComparisonResult,
): ComparisonProductKey | null => {
  if (profile.bestProductId) {
    if (profile.bestProductId === result.product1.productId) {
      return 'product1';
    }

    if (profile.bestProductId === result.product2.productId) {
      return 'product2';
    }
  }

  return profile.winner === 'product1' || profile.winner === 'product2' ? profile.winner : null;
};

export const getOutcomeState = (
  profile: ProfileComparisonResult,
  result: ProductComparisonResult,
): ComparisonOutcomeState => {
  if (profile.winner === 'neither') {
    return 'no-match';
  }

  if (profile.winner === 'tie') {
    return 'close-match';
  }

  return getBestProductKey(profile, result) ? 'best-choice' : 'neutral';
};

export const getProductStatusLabel = (
  productKey: ComparisonProductKey,
  outcome: ComparisonOutcomeState,
  bestProductKey: ComparisonProductKey | null,
): string | undefined => {
  if (outcome === 'no-match') {
    return 'Not suitable';
  }

  if (bestProductKey === productKey) {
    return 'Best choice';
  }

  if (outcome === 'close-match') {
    return 'Close match';
  }

  return undefined;
};