import type { ProfileProductScore } from '@acme/shared';

export interface EvaluationBlockConfig {
  key: 'positives' | 'negatives';
  title: string;
  items: ProfileProductScore['positives'] | ProfileProductScore['negatives'];
}

export const getEvaluationBlockConfigs = (
  profile: ProfileProductScore,
): EvaluationBlockConfig[] => {
  if (profile.fitLabel === 'poor_fit') {
    return [
      {
        key: 'negatives',
        title: "Why it doesn't fit",
        items: profile.negatives,
      },
      {
        key: 'positives',
        title: 'What still works',
        items: profile.positives,
      },
    ];
  }

  if (profile.fitLabel === 'neutral') {
    return [
      {
        key: 'positives',
        title: 'What works',
        items: profile.positives,
      },
      {
        key: 'negatives',
        title: "What doesn't work",
        items: profile.negatives,
      },
    ];
  }

  return [
    {
      key: 'positives',
      title: 'What works',
      items: profile.positives,
    },
    {
      key: 'negatives',
      title: 'Concerns',
      items: profile.negatives,
    },
  ];
};