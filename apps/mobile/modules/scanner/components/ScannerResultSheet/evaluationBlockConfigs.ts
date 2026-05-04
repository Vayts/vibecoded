import type { ScoreReason, ScannerProfileResult } from '@acme/shared';

export interface EvaluationBlockConfig {
  key: 'positives' | 'negatives';
  title: string;
  items: ScoreReason[];
}

export const getEvaluationBlockConfigs = (
  profile: ScannerProfileResult,
): EvaluationBlockConfig[] => {
  const score = profile.analysis.overall.score;

  if (score < 40) {
    return [
      {
        key: 'negatives',
        title: "Why it doesn't fit",
        items: profile.analysis.negatives,
      },
      {
        key: 'positives',
        title: 'What still works',
        items: profile.analysis.positives,
      },
    ];
  }

  if (score < 70) {
    return [
      {
        key: 'positives',
        title: 'Positives',
        items: profile.analysis.positives,
      },
      {
        key: 'negatives',
        title: 'Negatives',
        items: profile.analysis.negatives,
      },
    ];
  }

  return [
    {
      key: 'positives',
      title: 'What works',
      items: profile.analysis.positives,
    },
    {
      key: 'negatives',
      title: 'Concerns',
      items: profile.analysis.negatives,
    },
  ];
};
