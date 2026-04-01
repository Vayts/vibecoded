import type { EvaluationItem, ProductEvaluation } from '@acme/shared';

type EvaluationSeverity = EvaluationItem['severity'];
type EvaluationRating = ProductEvaluation['rating'];

export interface EvaluatorResult {
  scoreDelta: number;
  positive?: EvaluationItem;
  negative?: EvaluationItem;
}

export const BASE_SCORE = 50;

export const clampScore = (score: number): number => {
  return Math.max(0, Math.min(100, score));
};

export const createItem = (
  key: string,
  label: string,
  description: string,
  value: number | null,
  unit: string | null,
  severity: EvaluationSeverity,
): EvaluationItem => ({
  key,
  label,
  description,
  value,
  unit,
  severity,
});

export const getRating = (overallScore: number): EvaluationRating => {
  if (overallScore >= 80) {
    return 'excellent';
  }

  if (overallScore >= 60) {
    return 'good';
  }

  if (overallScore >= 40) {
    return 'average';
  }

  return 'bad';
};
