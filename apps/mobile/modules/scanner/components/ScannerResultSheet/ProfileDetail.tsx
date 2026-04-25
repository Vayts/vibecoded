import type { IngredientAnalysis, ProductFacts, ProfileProductScore } from '@acme/shared';
import React from 'react';
import { View } from 'react-native';

import { EvaluationSection } from './EvaluationSection';
import { IngredientsSection } from './IngredientsSection';
import { mapFitLabelToToneKey } from './evaluationHelpers';
import { getEvaluationBlockConfigs } from './evaluationBlockConfigs';
import { ProfileCompatibilityAccordion } from './ProfileCompatibilityAccordion';
import type { ProfileCompatibilityPreferences } from './profileCompatibilityAccordionHelpers';
import { ScoreSummary } from './ScoreSummary';

interface ProfileDetailProps {
  profile: ProfileProductScore;
  productFacts?: ProductFacts | null;
  profilePreferences: ProfileCompatibilityPreferences | null;
  rawIngredients: string[];
  rawIngredientsText: string | null;
  isIngredientAnalysisPending: boolean;
  profileIngredientAnalysis?: IngredientAnalysis | null;
}

export function ProfileDetail({
  profile,
  productFacts,
  profilePreferences,
  rawIngredients,
  rawIngredientsText,
  isIngredientAnalysisPending,
  profileIngredientAnalysis,
}: ProfileDetailProps) {
  const forLabel = `For ${profile.name.toLowerCase() === 'you' ? 'you' : profile.name}`;
  const evaluationBlocks = getEvaluationBlockConfigs(profile);

  return (
    <View>
      <ScoreSummary
        score={profile.score}
        label={profile.fitLabel}
        toneKey={mapFitLabelToToneKey(profile.fitLabel)}
        insight={profile.summary}
        positives={profile.positives}
        negatives={profile.negatives}
      />
      <ProfileCompatibilityAccordion
        profile={profile}
        productFacts={productFacts}
        profilePreferences={profilePreferences}
      />
      {evaluationBlocks.map((block) => (
        <EvaluationSection
          key={block.key}
          title={block.title}
          items={block.items}
          rightLabel={forLabel}
        />
      ))}
      <IngredientsSection
        rawIngredients={rawIngredients}
        rawIngredientsText={rawIngredientsText}
        isPending={isIngredientAnalysisPending}
        analysis={profileIngredientAnalysis}
      />
    </View>
  );
}


