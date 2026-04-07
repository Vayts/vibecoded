import type { AnalysisJobResponse, ProfileProductScore } from '@acme/shared';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { ProfileChips } from '../../../../shared/components/ProfileChips';
import type { ProfileChipItem } from '../../../../shared/components/ProfileChips';
import { mapFitLabelToToneKey } from './evaluationHelpers';
import { EvaluationSection } from './EvaluationSection';
import { IngredientsSection } from './IngredientsSection';
import { PersonalAnalysisFallback } from './PersonalAnalysisFallback';
import { PersonalAnalysisLoader } from './PersonalAnalysisLoader';
import { ScoreSummary } from './ScoreSummary';

interface PersonalTabContentProps {
  personalResult?: AnalysisJobResponse;
  isError: boolean;
  onRetry: () => void;
  rawIngredients: string[];
  rawIngredientsText: string | null;
}

export function PersonalTabContent({ personalResult, isError, onRetry, rawIngredients, rawIngredientsText }: PersonalTabContentProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string>('you');

  const analysisResult = personalResult?.result;
  const profiles = analysisResult?.profiles;
  const hasProductAnalysis = Boolean(analysisResult && profiles?.length);
  const isIngredientAnalysisPending =
    !hasProductAnalysis || personalResult?.ingredientsStatus === 'pending';

  const chipItems: ProfileChipItem[] = useMemo(
    () => profiles?.map((p) => ({ id: p.profileId, name: p.name, score: p.score })) ?? [],
    [profiles],
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
        {hasMultipleProfiles ? (
          <ProfileChips
            profiles={chipItems}
            selectedProfileId={activeProfile.profileId}
            onSelect={setSelectedProfileId}
            className="mt-4"
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
