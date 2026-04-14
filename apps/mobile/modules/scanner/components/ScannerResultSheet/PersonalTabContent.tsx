import type { AnalysisJobResponse, ProfileProductScore } from '@acme/shared';
import { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { getUserFallbackAvatarImage } from '../../../../shared/lib/avatar/selectAndUploadAvatarImage';
import { useAuthStore } from '../../../../shared/stores/authStore';
import { useFamilyMembersQuery } from '../../../family/hooks/useFamilyMembers';
import { useCurrentUserQuery } from '../../../profile/api/profileQueries';
import { mapFitLabelToToneKey } from './evaluationHelpers';
import { EvaluationSection } from './EvaluationSection';
import { IngredientsSection } from './IngredientsSection';
import { PersonalAnalysisFallback } from './PersonalAnalysisFallback';
import { PersonalAnalysisLoader } from './PersonalAnalysisLoader';
import {
  ProfileScoreSelector,
  type ProfileScoreSelectorItem,
} from './ProfileScoreSelector';
import { ScoreSummary } from './ScoreSummary';
import { Button } from '../../../../shared/components/Button';

interface PersonalTabContentProps {
  personalResult?: AnalysisJobResponse;
  isError: boolean;
  onRetry: () => void;
  rawIngredients: string[];
  onComparePress?: () => void;
  rawIngredientsText: string | null;
}

export function PersonalTabContent({ personalResult, isError, onRetry, rawIngredients, onComparePress, rawIngredientsText }: PersonalTabContentProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string>('you');
  const authUser = useAuthStore((s) => s.user);
  const currentUserQuery = useCurrentUserQuery(authUser?.id);
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

    // Ensure selected profile exists, fallback to first
    const activeProfile =
      profiles.find((p) => p.profileId === selectedProfileId) ?? profiles[0];

    if (!activeProfile) {
      return <PersonalAnalysisFallback onRetry={onRetry} />;
    }

    // Per-profile ingredient analysis, fallback to global analysis for backward compat
    const profileIngredientAnalysis =
      activeProfile.ingredientAnalysis ?? analysisResult?.ingredientAnalysis;

    return (
      <View>
        <View className="px-4">
          <View className="h-[1px] w-full bg-neutrals-200 mb-4"/>
        </View>

        <Text className="px-4 mb-4 font-bold text-lg">Analysis results</Text>

        {hasMultipleProfiles ? (
          <ProfileScoreSelector
            profiles={chipItems}
            selectedProfileId={activeProfile.profileId}
            onSelect={setSelectedProfileId}
          />
        ) : null}

        <View className="px-4">
          <ProfileDetail profile={activeProfile} />

          <IngredientsSection
            rawIngredients={rawIngredients}
            rawIngredientsText={rawIngredientsText}
            isPending={isIngredientAnalysisPending}
            analysis={profileIngredientAnalysis}
          />

          <View className="mt-4">
            <Button onPress={onComparePress} fullWidth label="Compare with another" variant="secondary"/>
          </View>
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

interface ProfileDetailProps {
  profile: ProfileProductScore;
}

function ProfileDetail({ profile }: ProfileDetailProps) {
  const forLabel = `For ${profile.name.toLowerCase() === 'you' ? 'you' : profile.name}`;

  return (
    <View>
      <ScoreSummary
        title="Fit score"
        score={profile.score}
        label={profile.fitLabel}
        toneKey={mapFitLabelToToneKey(profile.fitLabel)}
      />
      <EvaluationSection title="Positives" items={profile.positives} rightLabel={forLabel} />
      <EvaluationSection title="Negatives" items={profile.negatives} rightLabel={forLabel} />
    </View>
  );
}
