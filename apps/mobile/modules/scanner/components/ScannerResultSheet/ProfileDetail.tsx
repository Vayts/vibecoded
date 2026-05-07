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

export function ProfileDetail({ profile, rawIngredients, rawIngredientsText }: ProfileDetailProps) {
  const evaluationBlocks = getEvaluationBlockConfigs(profile);

  return (
    <View>
      <ScoreSummary
        score={profile.analysis.overall.score}
        rating={profile.analysis.overall.rating}
        summary={profile.analysis.overall.summary}
        safetyScore={profile.analysis.safety.score}
        safetyInfo={profile.analysis.safety}
        matchedAllergens={profile.analysis.safety.matchedAllergens}
        violatedRestrictions={profile.analysis.safety.violatedRestrictions}
        goalFitScore={profile.analysis.goalFit.score}
        nutritionScore={profile.analysis.nutrition.score}
        positives={profile.analysis.positives}
        negatives={profile.analysis.negatives}
      />
      <CanIHaveThisCard
        can={profile.ai.canIHaveThis.can}
        status={profile.ai.canIHaveThis.status}
        reason={profile.ai.canIHaveThis.reason}
        safetyInfo={profile.analysis.safety}
      />
      <ProfileCompatibilityAccordion profile={profile} />
      {evaluationBlocks.map((block) => (
        <EvaluationSection key={block.key} title={block.title} items={block.items} />
      ))}
      <IngredientsSection
        rawIngredients={rawIngredients}
        rawIngredientsText={rawIngredientsText}
        profileIngredients={profile.ai.ingredients}
      />
    </View>
  );
}
