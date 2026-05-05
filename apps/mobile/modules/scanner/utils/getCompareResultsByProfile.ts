import type { CompareProductsResponse } from '@acme/shared';
import { buildComparisonFacts } from './profileCompareFacts';
import {
  areProductsEquivalent,
  compareProductsForProfile,
  isUnsuitable,
} from './profileCompareRanking';
import type {
  ComparedProduct,
  CompareProductItem,
  ProfileCompareResult,
} from './profileCompareTypes';

const hasCompleteProfilePair = (products: ComparedProduct[]) => products.length >= 2;

const toComparedProduct = (
  productItem: CompareProductItem,
  profile: CompareProductItem['profiles'][number],
): ComparedProduct => ({
  analysis: profile.analysis,
  barcode: productItem.barcode,
  product: productItem.product,
  productId: productItem.productId ?? '',
  profile,
  scanId: productItem.scanId ?? '',
});

const groupProductsByProfile = (
  products: CompareProductItem[],
): Record<string, ComparedProduct[]> => {
  const result: Record<string, ComparedProduct[]> = {};

  products.forEach((productItem) => {
    productItem.profiles?.forEach((profile) => {
      result[profile.profileId] = result[profile.profileId] ?? [];
      result[profile.profileId]?.push(toComparedProduct(productItem, profile));
    });
  });

  return result;
};

const buildNoSuitableProductResult = (
  profileProducts: [ComparedProduct, ComparedProduct],
): ProfileCompareResult => {
  const profile = profileProducts[0].profile;

  return {
    profileId: profile.profileId,
    displayName: profile.displayName ?? 'This profile',
    type: profile.type,
    status: 'no_suitable_product',
    products: profileProducts,
    winner: null,
    otherProduct: null,
    winnerBestAt: [],
    anotherProductMayBeBetterAt: [],
  };
};

const getBestProductForProfile = (
  profileProducts: [ComparedProduct, ComparedProduct],
): ProfileCompareResult => {
  const [a, b] = profileProducts;
  const profile = a.profile;

  if (isUnsuitable(a.analysis) && isUnsuitable(b.analysis)) {
    return buildNoSuitableProductResult(profileProducts);
  }

  const comparison = compareProductsForProfile(a, b);
  const winner = comparison >= 0 ? a : b;
  const otherProduct = comparison >= 0 ? b : a;
  const equivalent = areProductsEquivalent(a, b);

  return {
    profileId: profile.profileId,
    displayName: profile.displayName ?? 'This profile',
    type: profile.type,
    status: equivalent ? 'equivalent' : 'winner_found',
    products: profileProducts,
    winner,
    otherProduct,
    winnerBestAt: buildComparisonFacts(winner, otherProduct),
    anotherProductMayBeBetterAt: buildComparisonFacts(otherProduct, winner),
  };
};

export const getCompareResultsByProfile = (
  compareResponse: CompareProductsResponse,
): ProfileCompareResult[] => {
  const productsByProfile = groupProductsByProfile(compareResponse.products ?? []);

  return Object.values(productsByProfile)
    .filter(hasCompleteProfilePair)
    .map((profileProducts) => getBestProductForProfile([profileProducts[0], profileProducts[1]]));
};
