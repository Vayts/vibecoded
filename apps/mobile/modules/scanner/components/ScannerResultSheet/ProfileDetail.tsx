import type { ScannerProfileResult } from '@acme/shared';
import React from 'react';
import { View } from 'react-native';

import { CanIHaveThisCard } from './CanIHaveThisCard';
import { EvaluationSection } from './EvaluationSection';
import { IngredientsSection } from './IngredientsSection';
import { getEvaluationBlockConfigs } from './evaluationBlockConfigs';
import { ProfileCompatibilityAccordion } from './ProfileCompatibilityAccordion';
import { ScoreSummary } from './ScoreSummary';

interface ProfileDetailProps {
  profile: ScannerProfileResult;
  rawIngredients: string[];
  rawIngredientsText: string | null;
}

export function ProfileDetail({
  profile,
  rawIngredients,
  rawIngredientsText,
}: ProfileDetailProps) {
  const forLabel = `For ${profile.displayName?.toLowerCase() === 'you' ? 'you' : (profile.displayName ?? 'this profile')}`;
  const evaluationBlocks = getEvaluationBlockConfigs(profile);

  return (
    <View>
      {/*<ProfileAnalysisTags*/}
      {/*  goal={profile.analysis.goalFit.goal}*/}
      {/*  nutritionPositives={profile.analysis.nutrition.positives}*/}
      {/*/>*/}
      <ScoreSummary
        score={profile.analysis.overall.score}
        rating={profile.analysis.overall.rating}
        summary={profile.analysis.overall.summary}
        safetyScore={profile.analysis.safety.score}
        goalFitScore={profile.analysis.goalFit.score}
        nutritionScore={profile.analysis.nutrition.score}
        positives={profile.analysis.positives}
        negatives={profile.analysis.negatives}
      />
      <CanIHaveThisCard can={profile.ai.canIHaveThis.can} reason={profile.ai.canIHaveThis.reason} />
      <ProfileCompatibilityAccordion profile={profile} />
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
        profileIngredients={profile.ai.ingredients}
      />
    </View>
  );
}


