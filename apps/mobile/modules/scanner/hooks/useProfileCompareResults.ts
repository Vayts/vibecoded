import type { CompareProductsResponse } from '@acme/shared';
import { useEffect, useMemo, useState } from 'react';
import type {
  ComparedProduct,
  CompareProductItem,
  ProfileCompareResult,
} from '../utils/profileCompareTypes';

export type RawComparisonResult = CompareProductsResponse;

const toComparedProduct = (
  product: CompareProductItem,
  profileId: string,
): ComparedProduct | null => {
  const profile = product.profiles.find((item) => item.profileId === profileId);

  if (!profile) {
    return null;
  }

  return {
    analysis: profile.analysis,
    barcode: product.barcode,
    product: product.product,
    productId: product.productId ?? '',
    profile,
    scanId: product.scanId ?? '',
  };
};

const buildProfileResults = (result: CompareProductsResponse): ProfileCompareResult[] => {
  return result.profileResults
    .map((profileResult) => {
      const comparedProducts = result.products
        .map((product) => toComparedProduct(product, profileResult.profileId))
        .filter((product): product is ComparedProduct => product != null);

      if (comparedProducts.length !== 2) {
        return null;
      }

      const products = [comparedProducts[0], comparedProducts[1]] as [ComparedProduct, ComparedProduct];
      const productsByBarcode = new Map(products.map((product) => [product.barcode, product]));

      return {
        profileId: profileResult.profileId,
        displayName: profileResult.displayName,
        type: profileResult.type,
        status: profileResult.status,
        products,
        winner: profileResult.winnerBarcode
          ? (productsByBarcode.get(profileResult.winnerBarcode) ?? null)
          : null,
        otherProduct: profileResult.otherProductBarcode
          ? (productsByBarcode.get(profileResult.otherProductBarcode) ?? null)
          : null,
        winnerBestAt: profileResult.winnerBestAt,
        anotherProductMayBeBetterAt: profileResult.anotherProductMayBeBetterAt,
      } satisfies ProfileCompareResult;
    })
    .filter((profileResult): profileResult is ProfileCompareResult => profileResult != null);
};

export function useProfileCompareResults(result: RawComparisonResult | null | undefined) {
  const profileResults = useMemo<ProfileCompareResult[]>(() => {
    if (!result) {
      return [];
    }

    return buildProfileResults(result);
  }, [result]);

  const [selectedProfileId, setSelectedProfileId] = useState('');

  useEffect(() => {
    setSelectedProfileId('');
  }, [result]);

  const activeProfileId =
    profileResults.find((profile) => profile.profileId === selectedProfileId)?.profileId ??
    profileResults[0]?.profileId ??
    '';
  const activeProfile = profileResults.find((profile) => profile.profileId === activeProfileId);

  return {
    activeProfile,
    activeProfileId,
    profileResults,
    selectedProfileId: activeProfileId,
    setSelectedProfileId,
  };
}

