import type { ProductAnalysisResult } from '@acme/shared';
import { View } from 'react-native';
import { EvaluationSection } from './EvaluationSection';
import { ScoreSummary } from './ScoreSummary';

interface OverallTabContentProps {
  evaluation: ProductAnalysisResult;
}

export function OverallTabContent({ evaluation }: OverallTabContentProps) {
  return (
    <View>
      <ScoreSummary
        title="Overall score"
        score={evaluation.overallScore}
        label={evaluation.rating}
        toneKey={evaluation.rating}
      />
      <EvaluationSection title="Positives" items={evaluation.positives} rightLabel="For 100g" />
      <EvaluationSection title="Negatives" items={evaluation.negatives} rightLabel="For 100g" />
    </View>
  );
}
