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
  reasonThresholds?: NutritionReasonThresholds;
  unsaturatedFatHighlight?: {
    minTotalFatPer100g: number;
    minUnsaturatedFatPer100g: number;
    minUnsaturatedFatRatio: number;
  };
};

export type NutritionReasonThresholds = {
  proteinPositiveMin?: number;
  fiberPositiveMin?: number;
  sugarPositiveMax?: number;
  sugarNegativeMin?: number;
  sugarStrongNegativeMin?: number;
  sodiumPositiveMax?: number;
  sodiumNegativeMin?: number;
  saturatedFatNegativeMin?: number;
  calorieDensityNegativeMin?: number;
  additivesNegativeMin?: number;
  additivesStrongNegativeMin?: number;
};

export const DEFAULT_NUTRITION_REASON_THRESHOLDS: Required<NutritionReasonThresholds> = {
  proteinPositiveMin: 15,
  fiberPositiveMin: 5,
  sugarPositiveMax: 2,
  sugarNegativeMin: 10,
  sugarStrongNegativeMin: 20,
  sodiumPositiveMax: 0.1,
  sodiumNegativeMin: 0.6,
  saturatedFatNegativeMin: 10,
  calorieDensityNegativeMin: 400,
  additivesNegativeMin: 3,
  additivesStrongNegativeMin: 5,
};

export function getNutritionReasonThresholds(
  rule?: NutritionRoleRule,
): Required<NutritionReasonThresholds> {
  return {
    proteinPositiveMin:
      rule?.reasonThresholds?.proteinPositiveMin ??
      DEFAULT_NUTRITION_REASON_THRESHOLDS.proteinPositiveMin,
    fiberPositiveMin:
      rule?.reasonThresholds?.fiberPositiveMin ??
      DEFAULT_NUTRITION_REASON_THRESHOLDS.fiberPositiveMin,
    sugarPositiveMax:
      rule?.reasonThresholds?.sugarPositiveMax ??
      DEFAULT_NUTRITION_REASON_THRESHOLDS.sugarPositiveMax,
    sugarNegativeMin:
      rule?.reasonThresholds?.sugarNegativeMin ??
      DEFAULT_NUTRITION_REASON_THRESHOLDS.sugarNegativeMin,
    sugarStrongNegativeMin:
      rule?.reasonThresholds?.sugarStrongNegativeMin ??
      DEFAULT_NUTRITION_REASON_THRESHOLDS.sugarStrongNegativeMin,
    sodiumPositiveMax:
      rule?.reasonThresholds?.sodiumPositiveMax ??
      DEFAULT_NUTRITION_REASON_THRESHOLDS.sodiumPositiveMax,
    sodiumNegativeMin:
      rule?.reasonThresholds?.sodiumNegativeMin ??
      DEFAULT_NUTRITION_REASON_THRESHOLDS.sodiumNegativeMin,
    saturatedFatNegativeMin:
      rule?.reasonThresholds?.saturatedFatNegativeMin ??
      DEFAULT_NUTRITION_REASON_THRESHOLDS.saturatedFatNegativeMin,
    calorieDensityNegativeMin:
      rule?.reasonThresholds?.calorieDensityNegativeMin ??
      DEFAULT_NUTRITION_REASON_THRESHOLDS.calorieDensityNegativeMin,
    additivesNegativeMin:
      rule?.reasonThresholds?.additivesNegativeMin ??
      DEFAULT_NUTRITION_REASON_THRESHOLDS.additivesNegativeMin,
    additivesStrongNegativeMin:
      rule?.reasonThresholds?.additivesStrongNegativeMin ??
      DEFAULT_NUTRITION_REASON_THRESHOLDS.additivesStrongNegativeMin,
  };
}

export const NUTRITION_ROLE_RULES: Partial<Record<ProductRole, NutritionRoleRule>> = {
  generic_food: {
    reasonThresholds: {
      proteinPositiveMin: 15,
      fiberPositiveMin: 5,
      sugarPositiveMax: 2,
      sugarNegativeMin: 10,
      sugarStrongNegativeMin: 20,
      sodiumPositiveMax: 0.1,
      sodiumNegativeMin: 0.6,
      saturatedFatNegativeMin: 10,
      calorieDensityNegativeMin: 400,
      additivesNegativeMin: 3,
      additivesStrongNegativeMin: 5,
    },
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
    reasonThresholds: {
      sugarPositiveMax: 1,
      sodiumPositiveMax: 0.05,
      sodiumNegativeMin: 0.4,
      saturatedFatNegativeMin: 18,
      calorieDensityNegativeMin: 750,
      additivesNegativeMin: 2,
      additivesStrongNegativeMin: 4,
    },
    unsaturatedFatHighlight: {
      minTotalFatPer100g: 20,
      minUnsaturatedFatPer100g: 10,
      minUnsaturatedFatRatio: 0.7,
    },
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
    reasonThresholds: {
      sugarPositiveMax: 1,
      sugarNegativeMin: 5,
      sugarStrongNegativeMin: 10,
      sodiumPositiveMax: 0.08,
      sodiumNegativeMin: 0.25,
      calorieDensityNegativeMin: 40,
      additivesNegativeMin: 2,
      additivesStrongNegativeMin: 4,
    },
    weights: {
      sugar: 0.5,
      calorieDensity: 0.25,
      additives: 0.15,
      sodium: 0.1,
    },
  },
  water: {
    ignoredFacts: ['protein', 'fiber', 'saturatedFat'],
    reasonThresholds: {
      sugarPositiveMax: 0.5,
      sugarNegativeMin: 1.5,
      sugarStrongNegativeMin: 4,
      sodiumPositiveMax: 0.05,
      sodiumNegativeMin: 0.2,
      calorieDensityNegativeMin: 20,
      additivesNegativeMin: 1,
      additivesStrongNegativeMin: 3,
    },
    weights: {
      sugar: 0.35,
      sodium: 0.25,
      additives: 0.25,
      calorieDensity: 0.15,
    },
  },
  unsweetened_drink: {
    ignoredFacts: ['protein', 'fiber', 'saturatedFat'],
    reasonThresholds: {
      sugarPositiveMax: 0.5,
      sugarNegativeMin: 1.5,
      sugarStrongNegativeMin: 4,
      sodiumPositiveMax: 0.05,
      sodiumNegativeMin: 0.2,
      calorieDensityNegativeMin: 20,
      additivesNegativeMin: 1,
      additivesStrongNegativeMin: 3,
    },
    weights: {
      sugar: 0.35,
      sodium: 0.25,
      additives: 0.25,
      calorieDensity: 0.15,
    },
  },
  lean_protein: {
    ignoredFacts: ['fiber'],
    reasonThresholds: {
      proteinPositiveMin: 18,
      sugarPositiveMax: 2,
      sugarNegativeMin: 8,
      sugarStrongNegativeMin: 15,
      sodiumPositiveMax: 0.1,
      sodiumNegativeMin: 0.5,
      saturatedFatNegativeMin: 6,
      calorieDensityNegativeMin: 300,
      additivesNegativeMin: 3,
      additivesStrongNegativeMin: 5,
    },
    weights: {
      protein: 0.35,
      saturatedFat: 0.25,
      sodium: 0.2,
      additives: 0.1,
      ingredientSimplicity: 0.1,
    },
  },
  savory_snack: {
    reasonThresholds: {
      proteinPositiveMin: 10,
      fiberPositiveMin: 4,
      sodiumNegativeMin: 0.35,
      saturatedFatNegativeMin: 5,
      calorieDensityNegativeMin: 400,
      additivesNegativeMin: 2,
      additivesStrongNegativeMin: 4,
    },
    weights: {
      sodium: 0.3,
      calorieDensity: 0.35,
      additives: 0.2,
      saturatedFat: 0.05,
      protein: 0.05,
      fiber: 0.05,
    },
  },
  ready_meal: {
    reasonThresholds: {
      proteinPositiveMin: 10,
      fiberPositiveMin: 4,
      sugarPositiveMax: 3,
      sugarNegativeMin: 8,
      sugarStrongNegativeMin: 14,
      sodiumNegativeMin: 0.35,
      saturatedFatNegativeMin: 7,
      calorieDensityNegativeMin: 320,
      additivesNegativeMin: 3,
      additivesStrongNegativeMin: 5,
    },
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
  sweet_snack: {
    reasonThresholds: {
      fiberPositiveMin: 5,
      sugarNegativeMin: 6,
      sugarStrongNegativeMin: 12,
      sodiumNegativeMin: 0.3,
      saturatedFatNegativeMin: 6,
      calorieDensityNegativeMin: 320,
      additivesNegativeMin: 2,
      additivesStrongNegativeMin: 4,
    },
    weights: {
      sugar: 0.35,
      calorieDensity: 0.3,
      additives: 0.15,
      saturatedFat: 0.1,
      fiber: 0.05,
      protein: 0.05,
    },
  },
  dessert: {
    reasonThresholds: {
      fiberPositiveMin: 5,
      sugarNegativeMin: 8,
      sugarStrongNegativeMin: 16,
      sodiumNegativeMin: 0.3,
      saturatedFatNegativeMin: 6,
      calorieDensityNegativeMin: 300,
      additivesNegativeMin: 2,
      additivesStrongNegativeMin: 4,
    },
    weights: {
      sugar: 0.35,
      calorieDensity: 0.25,
      saturatedFat: 0.15,
      additives: 0.15,
      fiber: 0.05,
      protein: 0.05,
    },
  },
  candy_chocolate: {
    reasonThresholds: {
      sugarNegativeMin: 12,
      sugarStrongNegativeMin: 20,
      sodiumNegativeMin: 0.25,
      saturatedFatNegativeMin: 8,
      calorieDensityNegativeMin: 420,
      additivesNegativeMin: 2,
      additivesStrongNegativeMin: 4,
    },
    weights: {
      sugar: 0.4,
      calorieDensity: 0.25,
      saturatedFat: 0.15,
      additives: 0.1,
      fiber: 0.05,
      protein: 0.05,
    },
  },
  nuts_seeds: {
    ignoredFacts: ['calorieDensity'],
    portionGuidanceFacts: ['calorieDensity'],
    reasonThresholds: {
      proteinPositiveMin: 10,
      fiberPositiveMin: 4,
      sugarPositiveMax: 3,
      sugarNegativeMin: 12,
      sugarStrongNegativeMin: 20,
      sodiumNegativeMin: 0.25,
      saturatedFatNegativeMin: 9,
      additivesNegativeMin: 2,
      additivesStrongNegativeMin: 4,
    },
    unsaturatedFatHighlight: {
      minTotalFatPer100g: 12,
      minUnsaturatedFatPer100g: 7,
      minUnsaturatedFatRatio: 0.65,
    },
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
    reasonThresholds: {
      sugarPositiveMax: 2,
      sugarNegativeMin: 8,
      sugarStrongNegativeMin: 15,
      sodiumNegativeMin: 0.4,
      saturatedFatNegativeMin: 7,
      calorieDensityNegativeMin: 250,
      additivesNegativeMin: 2,
      additivesStrongNegativeMin: 4,
    },
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
