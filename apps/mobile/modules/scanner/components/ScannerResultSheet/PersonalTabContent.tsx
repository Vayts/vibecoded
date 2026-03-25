import type { PersonalAnalysisJobResponse } from '@acme/shared';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { mapFitLabelToToneKey } from './evaluationHelpers';
import { EvaluationSection } from './EvaluationSection';
import { PersonalAnalysisFallback } from './PersonalAnalysisFallback';
import { PersonalAnalysisLoader } from './PersonalAnalysisLoader';
import { ScoreSummary } from './ScoreSummary';

interface PersonalTabContentProps {
  personalResult?: PersonalAnalysisJobResponse;
  isError: boolean;
  onRetry: () => void;
}

export function PersonalTabContent({ personalResult, isError, onRetry }: PersonalTabContentProps) {
  if (personalResult?.status === 'completed' && personalResult.result) {
    return (
      <View>
        <ScoreSummary
          title="Fit score"
          score={personalResult.result.fitScore}
          label={personalResult.result.fitLabel}
          toneKey={mapFitLabelToToneKey(personalResult.result.fitLabel)}
        />
        {personalResult.result.summary ? (
          <View className="mt-4 rounded-xl border border-gray-100 bg-white px-4 py-4">
            <Typography variant="bodySecondary" className="leading-6 text-gray-700">
              {personalResult.result.summary}
            </Typography>
          </View>
        ) : null}
        <EvaluationSection
          title="Positives"
          items={personalResult.result.positives}
          rightLabel="For you"
        />
        <EvaluationSection
          title="Negatives"
          items={personalResult.result.negatives}
          rightLabel="For you"
        />
      </View>
    );
  }

  if (personalResult?.status === 'failed' || isError) {
    return <PersonalAnalysisFallback onRetry={onRetry} />;
  }

  return <PersonalAnalysisLoader />;
}
