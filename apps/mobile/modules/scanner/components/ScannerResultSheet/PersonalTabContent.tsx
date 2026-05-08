import type { PersonalAnalysisJob } from '@acme/shared';
import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { IngredientsSection } from './IngredientsSection';
import { PersonalAnalysisFallback } from './PersonalAnalysisFallback';
import { PersonalAnalysisLoader } from './PersonalAnalysisLoader';
import { ProfileDetail } from './ProfileDetail';
import { getActiveProfile } from './productResultPreviewHelpers';

interface PersonalTabContentProps {
  bottomAction?: ReactNode;
  personalResult?: PersonalAnalysisJob;
  isError: boolean;
  onRetry: () => void;
  rawIngredients: string[];
  selectedProfileId: string;
  rawIngredientsText: string | null;
}

export function PersonalTabContent({
  bottomAction,
  personalResult,
  isError,
  onRetry,
  rawIngredients,
  selectedProfileId,
  rawIngredientsText,
}: PersonalTabContentProps) {
  const analysisResult = personalResult?.result;
  const profiles = analysisResult?.profiles;
  const hasProductAnalysis = Boolean(analysisResult && profiles?.length);

  if (hasProductAnalysis && profiles) {
    const activeProfile = getActiveProfile(profiles, selectedProfileId);

    if (!activeProfile) {
      return <PersonalAnalysisFallback onRetry={onRetry} />;
    }
    const resolvedIngredients = analysisResult?.product.ingredients ?? rawIngredients;
    const resolvedIngredientsText = rawIngredientsText;

    return (
      <View>
        <Text className="px-4 font-bold text-lg">Analysis results</Text>

        <View className="pb-4">
          <ProfileDetail
            profile={activeProfile}
            rawIngredients={resolvedIngredients}
            rawIngredientsText={resolvedIngredientsText}
          />
        </View>

        <View className="bg-background px-4 border-t border-neutrals-200">{bottomAction}</View>
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
        description="We're scoring this product for your profile."
      />
    </View>
  );
}
