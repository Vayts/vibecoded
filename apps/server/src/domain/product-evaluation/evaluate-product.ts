import type { BarcodeLookupProduct, ProductEvaluation } from '@acme/shared';

import { BASE_SCORE, clampScore, getRating } from './shared';
import {
  evaluateCalorieCoverage,
  evaluateFiberCoverage,
  evaluateProteinCoverage,
  evaluateSaltCoverage,
} from './coverage-rules';
import {
  evaluateAdditives,
  evaluateIngredients,
  evaluateNutriScore,
} from './heuristic-rules';
import {
  evaluateCalories,
  evaluateFat,
  evaluateFiber,
  evaluateProtein,
  evaluateSalt,
  evaluateSugar,
} from './nutrition-rules';

export const evaluateProduct = (product: BarcodeLookupProduct): ProductEvaluation => {
  const results = [
    evaluateSugar(product),
    evaluateSalt(product),
    evaluateProtein(product),
    evaluateProteinCoverage(product),
    evaluateFiber(product),
    evaluateFiberCoverage(product),
    evaluateFat(product),
    evaluateCalories(product),
    evaluateCalorieCoverage(product),
    evaluateSaltCoverage(product),
    evaluateAdditives(product),
    evaluateIngredients(product),
    evaluateNutriScore(product),
  ];

  const unclampedScore = results.reduce((total, result) => total + result.scoreDelta, BASE_SCORE);
  const overallScore = clampScore(unclampedScore);
  const positives = results.flatMap((result) => (result.positive ? [result.positive] : []));
  const negatives = results.flatMap((result) => (result.negative ? [result.negative] : []));

  return {
    overallScore,
    rating: getRating(overallScore),
    positives,
    negatives,
  };
};
