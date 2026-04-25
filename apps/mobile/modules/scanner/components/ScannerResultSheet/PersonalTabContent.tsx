import type {
  AnalysisJobResponse,
  FamilyMember,
  OnboardingResponse,
} from '@acme/shared';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { getUserFallbackAvatarImage } from '../../../../shared/lib/avatar/selectAndUploadAvatarImage';
import { useAuthStore } from '../../../../shared/stores/authStore';
import { useFamilyMembersQuery } from '../../../family/hooks/useFamilyMembers';
import { useOnboardingQuery } from '../../../onboarding/api/onboardingQueries';
import { useCurrentUserQuery } from '../../../profile/api/profileQueries';
import { IngredientsSection } from './IngredientsSection';
import { PersonalAnalysisFallback } from './PersonalAnalysisFallback';
import { PersonalAnalysisLoader } from './PersonalAnalysisLoader';
import { ProfileDetail } from './ProfileDetail';
import {
  ProfileScoreSelector,
  type ProfileScoreSelectorItem,
} from './ProfileScoreSelector';
import type { ProfileCompatibilityPreferences } from './profileCompatibilityAccordionHelpers';
import { getActiveProfile } from './productResultPreviewHelpers';

interface PersonalTabContentProps {
  bottomAction?: ReactNode;
  personalResult?: AnalysisJobResponse;
  isError: boolean;
  onRetry: () => void;
  onSelectProfile: (profileId: string) => void;
  rawIngredients: string[];
  selectedProfileId: string;
  rawIngredientsText: string | null;
}

const getFamilyMemberPreferences = (
  familyMember: FamilyMember | undefined,
): ProfileCompatibilityPreferences | null => {
  if (!familyMember) {
    return null;
  }

  return {
    restrictions: familyMember.restrictions,
    allergies: familyMember.allergies,
    otherAllergiesText: familyMember.otherAllergiesText,
  };
};

const getSelfPreferences = (
  onboarding: OnboardingResponse | undefined,
): ProfileCompatibilityPreferences | null => {
  if (!onboarding) {
    return null;
  }

  return {
    restrictions: onboarding.restrictions,
    allergies: onboarding.allergies,
    otherAllergiesText: onboarding.otherAllergiesText,
  };
};

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
  const onboardingQuery = useOnboardingQuery(authUser?.id);
  const familyMembersQuery = useFamilyMembersQuery();

  const analysisResult = personalResult?.result;
  const profiles = analysisResult?.profiles;
  const hasProductAnalysis = Boolean(analysisResult && profiles?.length);
  const isIngredientAnalysisPending =
    !hasProductAnalysis || personalResult?.ingredientsStatus === 'pending';
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
        const isCurrentUser = profile.profileId === 'you';

        return {
          id: profile.profileId,
          name: profile.name,
          score: profile.score,
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

    // Per-profile ingredient analysis, fallback to global analysis for backward compat
    const profileIngredientAnalysis =
      activeProfile.ingredientAnalysis ?? analysisResult?.ingredientAnalysis;
    const activeFamilyMember = familyMembersById.get(activeProfile.profileId);
    const activeProfilePreferences: ProfileCompatibilityPreferences | null =
      activeProfile.profileId === 'you'
        ? getSelfPreferences(onboardingQuery.data)
        : getFamilyMemberPreferences(activeFamilyMember);

    return (
      <View>
        <View className="px-4">
          <View className="h-[1px] w-full bg-neutrals-200 mb-4"/>
        </View>

        <Text className="px-4 font-bold text-lg">Analysis results</Text>

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
            productFacts={analysisResult?.productFacts}
            profilePreferences={activeProfilePreferences}
            rawIngredients={rawIngredients}
            rawIngredientsText={rawIngredientsText}
            isIngredientAnalysisPending={isIngredientAnalysisPending}
            profileIngredientAnalysis={profileIngredientAnalysis}
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
          rawIngredients={rawIngredients}
          rawIngredientsText={rawIngredientsText}
          isPending={false}
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

