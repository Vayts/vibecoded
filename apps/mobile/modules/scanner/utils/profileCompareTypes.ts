import type { CompareProductsResponse } from '@acme/shared';

export type CompareProductItem = CompareProductsResponse['products'][number];
export type CompareProductProfile = CompareProductItem['profiles'][number];
export type CompareProductAnalysis = CompareProductProfile['analysis'];
export type ComparedProductCore = CompareProductItem['product'];

export type ProfileCompareStatus = 'winner_found' | 'no_suitable_product' | 'equivalent';

export type CompareFactCategory =
  | 'safety'
  | 'allergens'
  | 'restrictions'
  | 'nutrition'
  | 'ingredients';

export interface ComparedProduct {
  analysis: CompareProductAnalysis;
  barcode: string;
  product: ComparedProductCore;
  productId: string;
  profile: CompareProductProfile;
  scanId: string;
}

export interface CompareFact {
  category: CompareFactCategory;
  comparedTo?: string | number | null;
  key: string;
  label: string;
  value?: string | number | null;
}

export interface ProfileCompareResult {
  anotherProductMayBeBetterAt: CompareFact[];
  displayName: string;
  otherProduct: ComparedProduct | null;
  profileId: string;
  products: [ComparedProduct, ComparedProduct];
  type: CompareProductProfile['type'];
  status: ProfileCompareStatus;
  winner: ComparedProduct | null;
  winnerBestAt: CompareFact[];
}
