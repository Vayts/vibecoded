import type { MainGoal } from '../types/scoring.types.js';
import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import type { GoalFitResult } from '../types/scoring.types.js';
import type { ProductRole } from '../types/product-role.types.js';
import { getGoalRoleWeights } from '../constants/goal-role-weights.constants.js';
import {
  scoreLowerIsBetter,
  scoreHigherIsBetter,
  weightedAverage,
  clampScore,
} from './nutrient-score.util.js';

function computeUnsaturatedFatRatioScore(
  fat: number | null,
  saturatedFat: number | null,
): number | null {
  if (fat === null || fat <= 0) return null;
  const saturated = saturatedFat ?? 0;
  const ratio = Math.max(0, fat - saturated) / fat;
  return clampScore(ratio * 100);
}

function buildSubScores(product: NormalizedProductV2): Record<string, number | null> {
  const cal =
    product.nutrition.caloriesPerServing !== null
      ? product.nutrition.caloriesPerServing
      : product.nutrition.caloriesPer100g;

  return {
    caloriesPerServing: scoreLowerIsBetter(cal, 0, 800),
    protein: scoreHigherIsBetter(product.nutrition.proteinPer100g, 0, 30),
    sugar: scoreLowerIsBetter(product.nutrition.sugarPer100g, 0, 50),
    fiber: scoreHigherIsBetter(product.nutrition.fiberPer100g, 0, 10),
    saturatedFat: scoreLowerIsBetter(product.nutrition.saturatedFatPer100g, 0, 30),
    sodium: scoreLowerIsBetter(product.nutrition.sodiumPer100g, 0, 2),
    additives: scoreLowerIsBetter(product.additives.length, 0, 10),
    unsaturatedFatRatio: computeUnsaturatedFatRatioScore(
      product.nutrition.fatPer100g,
      product.nutrition.saturatedFatPer100g,
    ),
  };
}

export function calculateGoalFitScore(
  goal: MainGoal | null,
  role: ProductRole,
  product: NormalizedProductV2,
): GoalFitResult {
  const weights = getGoalRoleWeights(goal, role);
  const subScores = buildSubScores(product);
  const usedServingSize = product.nutrition.caloriesPerServing !== null;

  const { score, missingMetrics } = weightedAverage(subScores, weights as Record<string, number>);

  const positives: string[] = [];
  const negatives: string[] = [];

  // Build positives/negatives from sub-scores
  const protein = subScores.protein;
  const sugar = subScores.sugar;
  const fiber = subScores.fiber;
  const satFat = subScores.saturatedFat;
  const sodium = subScores.sodium;
  const unsatRatio = subScores.unsaturatedFatRatio;
  const calScore = subScores.caloriesPerServing;
  const additives = subScores.additives;

  if (protein !== null && protein >= 70) positives.push('Good protein content');
  if (fiber !== null && fiber >= 70) positives.push('Good fiber content');
  if (sugar !== null && sugar >= 80) positives.push('Low sugar');
  if (satFat !== null && satFat >= 80) positives.push('Low saturated fat');
  if (sodium !== null && sodium >= 80) positives.push('Very low sodium');
  if (unsatRatio !== null && unsatRatio >= 70) positives.push('Good fat profile');
  if (additives !== null && additives >= 80) positives.push('Few or no additives');

  if (calScore !== null && calScore <= 40) {
    negatives.push(
      usedServingSize ? 'Calorie-dense, portion size matters' : 'High calorie density',
    );
  }
  if (sugar !== null && sugar <= 40) negatives.push('High sugar content');
  if (satFat !== null && satFat <= 40) negatives.push('High saturated fat');
  if (sodium !== null && sodium <= 40) negatives.push('High sodium content');
  if (protein !== null && protein <= 30 && (weights as Record<string, number>).protein)
    negatives.push('Low protein content');
  if (fiber !== null && fiber <= 30 && (weights as Record<string, number>).fiber)
    negatives.push('Low fiber content');

  const details: Record<string, unknown> = {
    usedServingSize,
    subScores,
  };

  if (missingMetrics.length > 0) {
    details.missingMetrics = missingMetrics;
  }

  return { score, goal, role, positives, negatives, details };
}
