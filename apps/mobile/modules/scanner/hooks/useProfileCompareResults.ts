import type { CompareProductsResponse, ProductComparisonResult } from '@acme/shared';
import { useEffect, useMemo, useState } from 'react';
import { getCompareResultsByProfile } from '../utils/getCompareResultsByProfile';
import type { ProfileCompareResult } from '../utils/profileCompareTypes';

export type RawComparisonResult = CompareProductsResponse | ProductComparisonResult;

export const isCompareProductsResponse = (
  value: RawComparisonResult | null | undefined,
): value is CompareProductsResponse => {
  return Boolean(value && 'products' in value && Array.isArray(value.products));
};

export function useProfileCompareResults(result: RawComparisonResult | null | undefined) {
  const profileResults = useMemo<ProfileCompareResult[]>(() => {
    if (!isCompareProductsResponse(result)) {
      return [];
    }

    return getCompareResultsByProfile(result);
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
