import type { BarcodeLookupProduct } from '@acme/shared';

import { createItem, type EvaluatorResult } from './productEvaluationShared';

export const evaluateSugar = (product: BarcodeLookupProduct): EvaluatorResult => {
  const sugar = product.nutrition.sugars_100g;

  if (sugar == null) {
    return { scoreDelta: 0 };
  }

  if (sugar > 15) {
    return {
      scoreDelta: -15,
      negative: createItem('sugar', 'Sugar', 'High sugar content', sugar, 'g', 'bad'),
    };
  }

  if (sugar > 10) {
    return {
      scoreDelta: -8,
      negative: createItem(
        'sugar',
        'Sugar',
        'Moderately high sugar content',
        sugar,
        'g',
        'warning',
      ),
    };
  }

  if (sugar < 5) {
    return {
      scoreDelta: 10,
      positive: createItem('sugar', 'Sugar', 'Low sugar content', sugar, 'g', 'good'),
    };
  }

  if (sugar < 10) {
    return {
      scoreDelta: 5,
      positive: createItem('sugar', 'Sugar', 'Reasonable sugar level', sugar, 'g', 'good'),
    };
  }

  return { scoreDelta: 0 };
};

export const evaluateSalt = (product: BarcodeLookupProduct): EvaluatorResult => {
  const salt = product.nutrition.salt_100g;

  if (salt == null) {
    return { scoreDelta: 0 };
  }

  if (salt > 1.5) {
    return {
      scoreDelta: -10,
      negative: createItem('salt', 'Salt', 'High salt content', salt, 'g', 'bad'),
    };
  }

  if (salt > 1) {
    return {
      scoreDelta: -5,
      negative: createItem('salt', 'Salt', 'Elevated salt content', salt, 'g', 'warning'),
    };
  }

  if (salt < 0.3) {
    return {
      scoreDelta: 5,
      positive: createItem('salt', 'Salt', 'Low salt content', salt, 'g', 'good'),
    };
  }

  if (salt < 0.8) {
    return {
      scoreDelta: 2,
      positive: createItem('salt', 'Salt', 'Reasonable salt level', salt, 'g', 'neutral'),
    };
  }

  return { scoreDelta: 0 };
};

export const evaluateProtein = (product: BarcodeLookupProduct): EvaluatorResult => {
  const protein = product.nutrition.proteins_100g;

  if (protein == null) {
    return { scoreDelta: 0 };
  }

  if (protein > 8) {
    return {
      scoreDelta: 10,
      positive: createItem('protein', 'Protein', 'Strong protein content', protein, 'g', 'good'),
    };
  }

  if (protein > 5) {
    return {
      scoreDelta: 5,
      positive: createItem('protein', 'Protein', 'Decent protein content', protein, 'g', 'good'),
    };
  }

  return { scoreDelta: 0 };
};

export const evaluateFiber = (product: BarcodeLookupProduct): EvaluatorResult => {
  const fiber = product.nutrition.fiber_100g;

  if (fiber == null) {
    return { scoreDelta: 0 };
  }

  if (fiber > 5) {
    return {
      scoreDelta: 10,
      positive: createItem('fiber', 'Fiber', 'Good amount of fiber', fiber, 'g', 'good'),
    };
  }

  if (fiber > 3) {
    return {
      scoreDelta: 5,
      positive: createItem('fiber', 'Fiber', 'Moderate fiber content', fiber, 'g', 'good'),
    };
  }

  return { scoreDelta: 0 };
};

export const evaluateFat = (product: BarcodeLookupProduct): EvaluatorResult => {
  const saturatedFat = product.nutrition.saturated_fat_100g;

  if (saturatedFat == null) {
    return { scoreDelta: 0 };
  }

  if (saturatedFat > 5) {
    return {
      scoreDelta: -10,
      negative: createItem(
        'saturated-fat',
        'Saturated fat',
        'High saturated fat content',
        saturatedFat,
        'g',
        'bad',
      ),
    };
  }

  if (saturatedFat > 2) {
    return {
      scoreDelta: -5,
      negative: createItem(
        'saturated-fat',
        'Saturated fat',
        'Elevated saturated fat content',
        saturatedFat,
        'g',
        'warning',
      ),
    };
  }

  if (saturatedFat < 1.5) {
    return {
      scoreDelta: 5,
      positive: createItem(
        'saturated-fat',
        'Saturated fat',
        'Low saturated fat content',
        saturatedFat,
        'g',
        'good',
      ),
    };
  }

  return { scoreDelta: 0 };
};

export const evaluateCalories = (product: BarcodeLookupProduct): EvaluatorResult => {
  const calories = product.nutrition.energy_kcal_100g;

  if (calories == null) {
    return { scoreDelta: 0 };
  }

  if (calories > 400) {
    return {
      scoreDelta: -10,
      negative: createItem('calories', 'Calories', 'High calorie density', calories, 'kcal', 'bad'),
    };
  }

  if (calories > 250) {
    return {
      scoreDelta: -5,
      negative: createItem(
        'calories',
        'Calories',
        'Moderately high calorie density',
        calories,
        'kcal',
        'warning',
      ),
    };
  }

  if (calories < 120) {
    return {
      scoreDelta: 6,
      positive: createItem('calories', 'Calories', 'Low calorie density', calories, 'kcal', 'good'),
    };
  }

  if (calories < 220) {
    return {
      scoreDelta: 3,
      positive: createItem(
        'calories',
        'Calories',
        'Reasonable calorie density',
        calories,
        'kcal',
        'neutral',
      ),
    };
  }

  return { scoreDelta: 0 };
};
