import type { GoalFitResult, MainGoal } from '../types/scoring.types.js';
import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import type { ProductRole } from '../types/product-role.types.js';
import { getGoalRoleWeights } from '../constants/goal-role-weights.constants.js';
import { weightedAverage } from './nutrient-score.util.js';
import { getProductRoleConfig } from './role-config.util.js';
import { buildNutrientSubScores, shouldUseServingSize } from './nutrient-subscore.util.js';
import { applyRoleScoreCaps } from './role-score-caps.util.js';
import { buildGoalFitReasons } from './goal-fit-reasons.util.js';

export function calculateGoalFitScore(
  goal: MainGoal | null,
  role: ProductRole,
  product: NormalizedProductV2,
): GoalFitResult {
  const roleConfig = getProductRoleConfig(role);
  const subScores = buildNutrientSubScores(product, roleConfig);
  const weights = getGoalRoleWeights(goal, role, roleConfig);
  const usedServingSize = shouldUseServingSize(product, roleConfig);
  const subScoreMap: Record<string, number | null> = { ...subScores };

  const { score, missingMetrics } = weightedAverage(subScoreMap, weights as Record<string, number>);
  const { score: cappedScore, appliedCaps } = applyRoleScoreCaps({
    score,
    roleConfig,
    product,
    goal,
  });

  const { positives, negatives } = buildGoalFitReasons({
    role,
    roleConfig,
    goal,
    product,
    subScores,
    weights,
    usedServingSize,
  });

  const details: Record<string, unknown> = {
    usedServingSize,
    roleConfig: {
      group: roleConfig.group,
      scoringProfile: roleConfig.scoringProfile,
    },
    subScores,
  };

  if (appliedCaps.length > 0) {
    details.appliedCaps = appliedCaps;
  }

  if (missingMetrics.length > 0) {
    details.missingMetrics = missingMetrics;
  }

  return {
    score: cappedScore,
    goal,
    role,
    positives,
    negatives,
    details,
  };
}
