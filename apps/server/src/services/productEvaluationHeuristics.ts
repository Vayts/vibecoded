import type { BarcodeLookupProduct } from '@acme/shared';

import { createItem, type EvaluatorResult } from './productEvaluationShared';

export const evaluateIngredients = (product: BarcodeLookupProduct): EvaluatorResult => {
  const ingredientCount = product.ingredients.length;

  if (ingredientCount > 0 && ingredientCount < 6) {
    return {
      scoreDelta: 5,
      positive: createItem(
        'ingredients',
        'Ingredients',
        'Short ingredient list',
        ingredientCount,
        'items',
        'good',
      ),
    };
  }

  if (ingredientCount >= 12) {
    return {
      scoreDelta: -5,
      negative: createItem(
        'ingredients',
        'Ingredients',
        'Long ingredient list',
        ingredientCount,
        'items',
        'warning',
      ),
    };
  }

  return { scoreDelta: 0 };
};

export const evaluateAdditives = (product: BarcodeLookupProduct): EvaluatorResult => {
  const additiveCount = product.additives_count ?? product.additives.length;

  if (additiveCount === 0 && product.ingredients.length > 0) {
    return {
      scoreDelta: 4,
      positive: createItem(
        'additives',
        'Additives',
        'No listed additives',
        additiveCount,
        'items',
        'good',
      ),
    };
  }

  if (additiveCount > 0 && additiveCount <= 2) {
    return {
      scoreDelta: 2,
      positive: createItem(
        'additives',
        'Additives',
        'Few listed additives',
        additiveCount,
        'items',
        'neutral',
      ),
    };
  }

  if (additiveCount >= 8) {
    return {
      scoreDelta: -8,
      negative: createItem(
        'additives',
        'Additives',
        'Many listed additives',
        additiveCount,
        'items',
        'bad',
      ),
    };
  }

  if (additiveCount >= 5) {
    return {
      scoreDelta: -4,
      negative: createItem(
        'additives',
        'Additives',
        'Several listed additives',
        additiveCount,
        'items',
        'warning',
      ),
    };
  }

  return { scoreDelta: 0 };
};

export const evaluateNutriScore = (product: BarcodeLookupProduct): EvaluatorResult => {
  const grade = product.scores.nutriscore_grade?.toUpperCase();
  const score = product.scores.nutriscore_score;

  if (!grade) {
    return { scoreDelta: 0 };
  }

  if (grade === 'A') {
    return {
      scoreDelta: 15,
      positive: createItem(
        'nutriscore',
        'Nutri-Score',
        'Excellent Nutri-Score grade',
        score,
        null,
        'good',
      ),
    };
  }

  if (grade === 'B') {
    return {
      scoreDelta: 10,
      positive: createItem(
        'nutriscore',
        'Nutri-Score',
        'Good Nutri-Score grade',
        score,
        null,
        'good',
      ),
    };
  }

  if (grade === 'C') {
    return {
      scoreDelta: 0,
      positive: createItem(
        'nutriscore',
        'Nutri-Score',
        'Balanced Nutri-Score grade',
        score,
        null,
        'neutral',
      ),
    };
  }

  if (grade === 'D') {
    return {
      scoreDelta: -10,
      negative: createItem(
        'nutriscore',
        'Nutri-Score',
        'Below-average Nutri-Score grade',
        score,
        null,
        'warning',
      ),
    };
  }

  if (grade === 'E') {
    return {
      scoreDelta: -15,
      negative: createItem(
        'nutriscore',
        'Nutri-Score',
        'Poor Nutri-Score grade',
        score,
        null,
        'bad',
      ),
    };
  }

  return { scoreDelta: 0 };
};
