import type { ProductRole } from '../types/product-role.types.js';

export type NutritionFactKey =
  | 'protein'
  | 'fiber'
  | 'sugar'
  | 'sodium'
  | 'saturatedFat'
  | 'calorieDensity'
  | 'caloriesPerServing'
  | 'additives'
  | 'ingredientSimplicity'
  | 'unsaturatedFatRatio'
  | 'fat';

export type NutritionRoleRule = {
  weights: Partial<Record<NutritionFactKey, number>>;
  ignoredFacts?: NutritionFactKey[];
  portionGuidanceFacts?: NutritionFactKey[];
};

export const NUTRITION_ROLE_RULES: Partial<Record<ProductRole, NutritionRoleRule>> = {
  generic_food: {
    weights: {
      protein: 0.16,
      fiber: 0.16,
      sugar: 0.18,
      sodium: 0.16,
      saturatedFat: 0.14,
      calorieDensity: 0.08,
      additives: 0.06,
      ingredientSimplicity: 0.06,
    },
  },
  oil: {
    ignoredFacts: ['protein', 'fiber'],
    portionGuidanceFacts: ['calorieDensity'],
    weights: {
      unsaturatedFatRatio: 0.35,
      saturatedFat: 0.25,
      ingredientSimplicity: 0.2,
      additives: 0.1,
      sugar: 0.05,
      sodium: 0.05,
    },
  },
  sugary_drink: {
    ignoredFacts: ['protein', 'fiber', 'saturatedFat'],
    weights: {
      sugar: 0.5,
      calorieDensity: 0.25,
      additives: 0.15,
      sodium: 0.1,
    },
  },
  water_unsweetened_drink: {
    ignoredFacts: ['protein', 'fiber', 'saturatedFat'],
    weights: {
      sugar: 0.35,
      sodium: 0.25,
      additives: 0.25,
      calorieDensity: 0.15,
    },
  },
  lean_protein: {
    ignoredFacts: ['fiber'],
    weights: {
      protein: 0.35,
      saturatedFat: 0.25,
      sodium: 0.2,
      additives: 0.1,
      ingredientSimplicity: 0.1,
    },
  },
  sweet_snack: {
    weights: {
      sugar: 0.35,
      saturatedFat: 0.25,
      calorieDensity: 0.2,
      additives: 0.1,
      ingredientSimplicity: 0.1,
    },
  },
  savory_snack: {
    weights: {
      sodium: 0.35,
      saturatedFat: 0.25,
      calorieDensity: 0.2,
      additives: 0.15,
      ingredientSimplicity: 0.05,
    },
  },
  ready_meal: {
    weights: {
      sodium: 0.25,
      protein: 0.2,
      fiber: 0.15,
      saturatedFat: 0.15,
      sugar: 0.1,
      additives: 0.1,
      calorieDensity: 0.05,
    },
  },
  nuts_seeds: {
    ignoredFacts: ['calorieDensity'],
    portionGuidanceFacts: ['calorieDensity'],
    weights: {
      unsaturatedFatRatio: 0.25,
      protein: 0.2,
      fiber: 0.2,
      sodium: 0.15,
      additives: 0.1,
      saturatedFat: 0.1,
    },
  },
  sauce_condiment: {
    ignoredFacts: ['protein', 'fiber'],
    portionGuidanceFacts: ['calorieDensity'],
    weights: {
      sodium: 0.3,
      sugar: 0.25,
      saturatedFat: 0.15,
      additives: 0.2,
      ingredientSimplicity: 0.1,
    },
  },
};

export const FALLBACK_NUTRITION_ROLE: ProductRole = 'generic_food';
