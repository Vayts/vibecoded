import type { PersonalAnalysisJob } from '@acme/shared';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { getUserFallbackAvatarImage } from '../../../../shared/lib/avatar/selectAndUploadAvatarImage';
import { useAuthStore } from '../../../../shared/stores/authStore';
import { useFamilyMembersQuery } from '../../../family/hooks/useFamilyMembers';
import { useCurrentUserQuery } from '../../../profile/api/profileQueries';
import { IngredientsSection } from './IngredientsSection';
import { PersonalAnalysisFallback } from './PersonalAnalysisFallback';
import { PersonalAnalysisLoader } from './PersonalAnalysisLoader';
import { ProfileDetail } from './ProfileDetail';
import {
  ProfileScoreSelector,
  type ProfileScoreSelectorItem,
} from './ProfileScoreSelector';
import { getActiveProfile } from './productResultPreviewHelpers';

interface PersonalTabContentProps {
  bottomAction?: ReactNode;
  personalResult?: PersonalAnalysisJob;
  isError: boolean;
  onRetry: () => void;
  onSelectProfile: (profileId: string) => void;
  rawIngredients: string[];
  selectedProfileId: string;
  rawIngredientsText: string | null;
}

export function PersonalTabContent({
  bottomAction,
  personalResult,
  isError,
  onRetry,
  onSelectProfile,
  rawIngredients,
  selectedProfileId,
  rawIngredientsText,
}: PersonalTabContentProps) {
  const authUser = useAuthStore((s) => s.user);
  const currentUserQuery = useCurrentUserQuery(authUser?.id);
  const familyMembersQuery = useFamilyMembersQuery();

  const analysisResult = personalResult?.result;
  const profiles = analysisResult?.profiles;
  const hasProductAnalysis = Boolean(analysisResult && profiles?.length);
  const currentUser = currentUserQuery.data ?? authUser;
  const currentUserFallbackImageUrl = getUserFallbackAvatarImage(currentUser);
  const familyMembersById = useMemo(
    () => new Map((familyMembersQuery.data?.items ?? []).map((member) => [member.id, member])),
    [familyMembersQuery.data?.items],
  );

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
          fallbackImageUrl: isCurrentUser ? currentUserFallbackImageUrl : null,
        };
      }) ?? [],
    [currentUser?.avatarUrl, currentUserFallbackImageUrl, familyMembersById, profiles],
  );

  if (hasProductAnalysis && profiles) {
    const hasMultipleProfiles = profiles.length > 1;
    const activeProfile = getActiveProfile(profiles, selectedProfileId);

    if (!activeProfile) {
      return <PersonalAnalysisFallback onRetry={onRetry} />;
    }
    const resolvedIngredients = analysisResult?.product.ingredients ?? rawIngredients;
    const resolvedIngredientsText = rawIngredientsText;

    return (
      <View>
        <Text className="px-4 font-bold text-lg">Analysis results</Text>
        <Text className="px-4 mt-1 text-sm text-gray-500">
          Viewing for {activeProfile.displayName ?? (activeProfile.type === 'user' ? 'you' : 'this profile')}
        </Text>

        {hasMultipleProfiles ? (
          <ProfileScoreSelector
            profiles={chipItems}
            selectedProfileId={activeProfile.profileId}
            onSelect={onSelectProfile}
          />
        ) : null}

        <View className="px-4 pb-4">
          <ProfileDetail
            profile={activeProfile}
            rawIngredients={resolvedIngredients}
            rawIngredientsText={resolvedIngredientsText}
          />
        </View>

        <View className="bg-background px-4 border-t border-neutrals-200">
          {bottomAction}
        </View>
      </View>
    );
  }

  if (personalResult?.status === 'failed' || isError) {
    return (
      <View className="px-4">
        <PersonalAnalysisFallback onRetry={onRetry} />
        <IngredientsSection
          rawIngredients={analysisResult?.product.ingredients ?? rawIngredients}
          rawIngredientsText={rawIngredientsText}
        />
      </View>
    );
  }

  return (
    <View className="px-4">
      <PersonalAnalysisLoader
        title="Analyzing product..."
        description="We&apos;re scoring this product for your profile."
      />
    </View>
  );
}

