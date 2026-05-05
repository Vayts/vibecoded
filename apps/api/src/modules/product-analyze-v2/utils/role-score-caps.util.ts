import type { MainGoal } from '../types/scoring.types.js';
import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import type { AppliedCap, ProductRoleConfig, RoleScoreCapMetric } from '../types/goal-fit.types.js';
import { calculateCaloriesPerServing } from './serving-size.util.js';

function getMetricValue(metric: RoleScoreCapMetric, product: NormalizedProductV2): number | null {
  switch (metric) {
    case 'caloriesPerServing':
      return (
        product.nutrition.caloriesPerServing ??
        calculateCaloriesPerServing(
          product.nutrition.caloriesPer100g,
          product.servingSizeGrams,
          product.servingSizeMl,
        ) ??
        product.nutrition.caloriesPer100g
      );
    case 'sugarPer100g':
      return product.nutrition.sugarPer100g;
    case 'sodiumPer100g':
      return product.nutrition.sodiumPer100g;
    case 'additivesCount':
      return product.additives.length;
    case 'saturatedFatPer100g':
      return product.nutrition.saturatedFatPer100g;
    default:
      return null;
  }
}

export function applyRoleScoreCaps({
  score,
  roleConfig,
  product,
  goal,
}: {
  score: number;
  roleConfig: ProductRoleConfig;
  product: NormalizedProductV2;
  goal: MainGoal | null;
}): { score: number; appliedCaps: AppliedCap[] } {
  const appliedCaps: AppliedCap[] = [];
  let cappedScore = score;

  for (const rule of roleConfig.caps ?? []) {
    if (rule.goals && goal && !rule.goals.includes(goal)) {
      continue;
    }

    if (rule.goals && !goal) {
      continue;
    }

    const actual = getMetricValue(rule.metric, product);
    if (actual === null || actual < rule.gte) {
      continue;
    }

    const nextScore = Math.min(cappedScore, rule.maxScore);
    if (nextScore === cappedScore) {
      continue;
    }

    appliedCaps.push({
      ...rule,
      actual,
      scoreBeforeCap: cappedScore,
      scoreAfterCap: nextScore,
    });
    cappedScore = nextScore;
  }

  return { score: cappedScore, appliedCaps };
}
