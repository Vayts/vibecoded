import type { CompareProductAnalysis, ComparedProduct } from './profileCompareTypes';

export const getSafetyRank = (status?: string | null): number => {
  if (status === 'safe') return 3;
  if (status === 'caution') return 2;
  if (status === 'avoid') return 1;
  return 0;
};

export const isUnsuitable = (analysis: CompareProductAnalysis): boolean => {
  return analysis.safety?.status === 'avoid' || analysis.overall?.rating === 'avoid';
};

export const compareProductsForProfile = (a: ComparedProduct, b: ComparedProduct): number => {
  const aSafety = getSafetyRank(a.analysis.safety?.status);
  const bSafety = getSafetyRank(b.analysis.safety?.status);

  if (aSafety !== bSafety) return aSafety - bSafety;

  const aOverall = a.analysis.overall?.score ?? 0;
  const bOverall = b.analysis.overall?.score ?? 0;

  if (aOverall !== bOverall) return aOverall - bOverall;

  const aGoalFit = a.analysis.goalFit?.score ?? 0;
  const bGoalFit = b.analysis.goalFit?.score ?? 0;

  if (aGoalFit !== bGoalFit) return aGoalFit - bGoalFit;

  const aNutrition = a.analysis.nutrition?.score ?? 0;
  const bNutrition = b.analysis.nutrition?.score ?? 0;

  if (aNutrition !== bNutrition) return aNutrition - bNutrition;

  const aNegatives = a.analysis.negatives?.length ?? 0;
  const bNegatives = b.analysis.negatives?.length ?? 0;

  return bNegatives - aNegatives;
};

export const areProductsEquivalent = (a: ComparedProduct, b: ComparedProduct): boolean => {
  const overallDiff = Math.abs((a.analysis.overall?.score ?? 0) - (b.analysis.overall?.score ?? 0));
  const goalFitDiff = Math.abs((a.analysis.goalFit?.score ?? 0) - (b.analysis.goalFit?.score ?? 0));
  const nutritionDiff = Math.abs(
    (a.analysis.nutrition?.score ?? 0) - (b.analysis.nutrition?.score ?? 0),
  );

  return (
    a.analysis.safety?.status === b.analysis.safety?.status &&
    overallDiff <= 2 &&
    goalFitDiff <= 2 &&
    nutritionDiff <= 2
  );
};
