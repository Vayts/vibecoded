import type { PersonalAnalysisJob } from '@acme/shared';
import { useMemo } from 'react';
import { View } from 'react-native';

import { useProfileScoreChipContext } from '../../../scans/hooks/useProfileScoreChipContext';
import { ProductResultHeader } from './ProductResultHeader';
import {
  type ProfileScoreSelectorItem,
} from './ProfileScoreSelector';
import type { ProductHeaderData } from './useProductResultHeaderChips';

interface ProductResultHeroProps {
  nutriScoreGrade: string | null | undefined;
  onSelectProfile: (profileId: string) => void;
  personalResult?: PersonalAnalysisJob;
  product: ProductHeaderData;
  selectedProfileId: string;
}

export function ProductResultHero({
  onSelectProfile,
  personalResult,
  product,
  selectedProfileId,
}: ProductResultHeroProps) {
  const profiles = personalResult?.result?.profiles;
  const { currentUser, familyMembersById } = useProfileScoreChipContext();
  const chipItems: ProfileScoreSelectorItem[] = useMemo(
    () =>
      profiles?.map((profile) => {
        const familyMember = familyMembersById.get(profile.profileId);
        const isCurrentUser = profile.type === 'user';

        return {
          id: profile.profileId,
          name: profile.displayName ?? (isCurrentUser ? 'You' : 'Profile'),
          score: profile.analysis.overall.score,
          imageUrl: isCurrentUser ? currentUser?.avatarUrl ?? null : familyMember?.avatarUrl ?? null,
          fallbackImageUrl: isCurrentUser ? currentUser?.fallbackImageUrl ?? null : null,
        };
      }) ?? [],
    [currentUser?.avatarUrl, currentUser?.fallbackImageUrl, familyMembersById, profiles],
  );

  return (
    <View className="px-4 pb-4">
      <ProductResultHeader
        product={product}
        profiles={chipItems}
        selectedProfileId={selectedProfileId}
        onSelect={onSelectProfile}
      />
    </View>
  );
}
