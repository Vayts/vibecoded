import type { BarcodeLookupProduct } from '@acme/shared';

import { createItem, type EvaluatorResult } from './shared';

export const evaluateProteinCoverage = (product: BarcodeLookupProduct): EvaluatorResult => {
  const protein = product.nutrition.proteins_100g;

  if (protein == null) {
    return { scoreDelta: 0 };
  }

  if (protein < 3) {
    return {
      scoreDelta: -4,
      negative: createItem(
        'protein-coverage',
        'Protein',
        'Very low protein density',
        protein,
        'g',
        'warning',
      ),
    };
  }

  if (protein >= 3 && protein <= 5) {
    return {
      scoreDelta: 2,
      positive: createItem(
        'protein-coverage',
        'Protein',
        'Some protein contribution',
        protein,
        'g',
        'neutral',
      ),
    };
  }

  return { scoreDelta: 0 };
};

export const evaluateFiberCoverage = (product: BarcodeLookupProduct): EvaluatorResult => {
  const fiber = product.nutrition.fiber_100g;

  if (fiber == null) {
    return { scoreDelta: 0 };
  }

  if (fiber < 2) {
    return {
      scoreDelta: -4,
      negative: createItem('fiber-coverage', 'Fiber', 'Low fiber density', fiber, 'g', 'warning'),
    };
  }

  if (fiber >= 2 && fiber <= 3) {
    return {
      scoreDelta: 2,
      positive: createItem(
        'fiber-coverage',
        'Fiber',
        'Some fiber contribution',
        fiber,
        'g',
        'neutral',
      ),
    };
  }

  return { scoreDelta: 0 };
};

export const evaluateSaltCoverage = (product: BarcodeLookupProduct): EvaluatorResult => {
  const salt = product.nutrition.salt_100g;

  if (salt == null || salt < 0.8 || salt > 1) {
    return { scoreDelta: 0 };
  }

  return {
    scoreDelta: -2,
    negative: createItem('salt-coverage', 'Salt', 'Borderline salt level', salt, 'g', 'warning'),
  };
};

export const evaluateCalorieCoverage = (product: BarcodeLookupProduct): EvaluatorResult => {
  const calories = product.nutrition.energy_kcal_100g;

  if (calories == null || calories < 220 || calories > 250) {
    return { scoreDelta: 0 };
  }

  return {
    scoreDelta: -2,
    negative: createItem(
      'calorie-coverage',
      'Calories',
      'Slightly calorie-dense',
      calories,
      'kcal',
      'warning',
    ),
  };
};
