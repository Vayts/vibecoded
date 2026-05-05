import {
  FALLBACK_NUTRITION_ROLE,
  NUTRITION_ROLE_RULES,
  type NutritionRoleRule,
} from '../constants/nutrition-role-rules.constants.js';
import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import type { ProductRole } from '../types/product-role.types.js';
import type { ScoreReason } from '@acme/shared';

export interface NutritionDisplayReason {
  key: string;
  label: string;
  description: string;
  value: number | null;
  unit: string | null;
  impact: number;
  kind: ScoreReason['kind'];
  source: ScoreReason['source'];
  category?: ScoreReason['category'];
}

interface ResolvedNutritionReasonThresholds {
  proteinPositiveMin: number;
  fiberPositiveMin: number;
  sugarPositiveMax: number;
  sugarNegativeMin: number;
  sugarStrongNegativeMin: number;
  sodiumPositiveMax: number;
  sodiumNegativeMin: number;
  saturatedFatNegativeMin: number;
  calorieDensityNegativeMin: number;
  additivesNegativeMin: number;
  additivesStrongNegativeMin: number;
}

const DEFAULT_REASON_THRESHOLDS: ResolvedNutritionReasonThresholds = {
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

const toSaltPer100g = (product: NormalizedProductV2): number | null => {
  if (product.nutrition.saltPer100g !== null) {
    return product.nutrition.saltPer100g;
  }

  if (product.nutrition.sodiumPer100g !== null) {
    return product.nutrition.sodiumPer100g * 2.5;
  }

  return null;
};

const toSodiumPer100g = (product: NormalizedProductV2): number | null => {
  if (product.nutrition.sodiumPer100g !== null) {
    return product.nutrition.sodiumPer100g;
  }

  if (product.nutrition.saltPer100g !== null) {
    return product.nutrition.saltPer100g / 2.5;
  }

  return null;
};

export function hasMeaningfulUnsaturatedFatHighlight(
  rule: NutritionRoleRule | undefined,
  nutrition: NormalizedProductV2['nutrition'],
): boolean {
  const config = rule?.unsaturatedFatHighlight;
  const totalFat = nutrition.fatPer100g;
  const saturatedFat = nutrition.saturatedFatPer100g;

  if (!config || totalFat === null || saturatedFat === null || totalFat <= 0) {
    return false;
  }

  const unsaturatedFat = Math.max(0, totalFat - saturatedFat);
  const unsaturatedFatRatio = unsaturatedFat / totalFat;

  return (
    totalFat >= config.minTotalFatPer100g &&
    unsaturatedFat >= config.minUnsaturatedFatPer100g &&
    unsaturatedFatRatio >= config.minUnsaturatedFatRatio
  );
}

const createReason = (reason: NutritionDisplayReason): NutritionDisplayReason => reason;

const getReasonThresholdsForRole = (role: ProductRole): ResolvedNutritionReasonThresholds => {
  switch (role) {
    case 'oil':
      return {
        ...DEFAULT_REASON_THRESHOLDS,
        sugarPositiveMax: 1,
        sodiumPositiveMax: 0.05,
        sodiumNegativeMin: 0.4,
        saturatedFatNegativeMin: 18,
        calorieDensityNegativeMin: 750,
        additivesNegativeMin: 2,
        additivesStrongNegativeMin: 4,
      };
    case 'sugary_drink':
      return {
        ...DEFAULT_REASON_THRESHOLDS,
        sugarPositiveMax: 1,
        sugarNegativeMin: 5,
        sugarStrongNegativeMin: 10,
        sodiumPositiveMax: 0.08,
        sodiumNegativeMin: 0.25,
        calorieDensityNegativeMin: 40,
        additivesNegativeMin: 2,
        additivesStrongNegativeMin: 4,
      };
    case 'water':
    case 'unsweetened_drink':
      return {
        ...DEFAULT_REASON_THRESHOLDS,
        sugarPositiveMax: 0.5,
        sugarNegativeMin: 1.5,
        sugarStrongNegativeMin: 4,
        sodiumPositiveMax: 0.05,
        sodiumNegativeMin: 0.2,
        calorieDensityNegativeMin: 20,
        additivesNegativeMin: 1,
        additivesStrongNegativeMin: 3,
      };
    case 'lean_protein':
      return {
        ...DEFAULT_REASON_THRESHOLDS,
        proteinPositiveMin: 18,
        sugarNegativeMin: 8,
        sugarStrongNegativeMin: 15,
        sodiumNegativeMin: 0.5,
        saturatedFatNegativeMin: 6,
        calorieDensityNegativeMin: 300,
      };
    case 'sweet_snack':
      return {
        ...DEFAULT_REASON_THRESHOLDS,
        fiberPositiveMin: 5,
        sugarNegativeMin: 6,
        sugarStrongNegativeMin: 12,
        sodiumNegativeMin: 0.3,
        saturatedFatNegativeMin: 6,
        calorieDensityNegativeMin: 320,
        additivesNegativeMin: 2,
        additivesStrongNegativeMin: 4,
      };
    case 'dessert':
      return {
        ...DEFAULT_REASON_THRESHOLDS,
        fiberPositiveMin: 5,
        sugarNegativeMin: 8,
        sugarStrongNegativeMin: 16,
        sodiumNegativeMin: 0.3,
        saturatedFatNegativeMin: 6,
        calorieDensityNegativeMin: 300,
        additivesNegativeMin: 2,
        additivesStrongNegativeMin: 4,
      };
    case 'candy_chocolate':
      return {
        ...DEFAULT_REASON_THRESHOLDS,
        sugarNegativeMin: 12,
        sugarStrongNegativeMin: 20,
        sodiumNegativeMin: 0.25,
        saturatedFatNegativeMin: 8,
        calorieDensityNegativeMin: 420,
        additivesNegativeMin: 2,
        additivesStrongNegativeMin: 4,
      };
    case 'savory_snack':
      return {
        ...DEFAULT_REASON_THRESHOLDS,
        proteinPositiveMin: 10,
        fiberPositiveMin: 4,
        sodiumNegativeMin: 0.35,
        saturatedFatNegativeMin: 5,
        calorieDensityNegativeMin: 400,
        additivesNegativeMin: 2,
        additivesStrongNegativeMin: 4,
      };
    case 'ready_meal':
      return {
        ...DEFAULT_REASON_THRESHOLDS,
        proteinPositiveMin: 10,
        fiberPositiveMin: 4,
        sugarPositiveMax: 3,
        sugarNegativeMin: 8,
        sugarStrongNegativeMin: 14,
        sodiumNegativeMin: 0.35,
        saturatedFatNegativeMin: 7,
        calorieDensityNegativeMin: 320,
      };
    case 'nuts_seeds':
      return {
        ...DEFAULT_REASON_THRESHOLDS,
        proteinPositiveMin: 10,
        fiberPositiveMin: 4,
        sugarPositiveMax: 3,
        sugarNegativeMin: 12,
        sugarStrongNegativeMin: 20,
        sodiumNegativeMin: 0.25,
        saturatedFatNegativeMin: 9,
        additivesNegativeMin: 2,
        additivesStrongNegativeMin: 4,
      };
    case 'sauce_condiment':
      return {
        ...DEFAULT_REASON_THRESHOLDS,
        sugarPositiveMax: 2,
        sugarNegativeMin: 8,
        sugarStrongNegativeMin: 15,
        sodiumNegativeMin: 0.4,
        saturatedFatNegativeMin: 7,
        calorieDensityNegativeMin: 250,
        additivesNegativeMin: 2,
        additivesStrongNegativeMin: 4,
      };
    default:
      return DEFAULT_REASON_THRESHOLDS;
  }
};

export function buildNutritionDisplayReasons(
  product: NormalizedProductV2,
  role: ProductRole,
): NutritionDisplayReason[] {
  const effectiveRole = NUTRITION_ROLE_RULES[role] ? role : FALLBACK_NUTRITION_ROLE;
  const rule = NUTRITION_ROLE_RULES[effectiveRole] ?? NUTRITION_ROLE_RULES[FALLBACK_NUTRITION_ROLE];
  const ignoredFacts = new Set(rule?.ignoredFacts ?? []);
  const portionGuidanceFacts = new Set(rule?.portionGuidanceFacts ?? []);
  const thresholds = getReasonThresholdsForRole(effectiveRole);

  const reasons: NutritionDisplayReason[] = [];
  const saltPer100g = toSaltPer100g(product);
  const sodiumPer100g = toSodiumPer100g(product);
  const sugarPer100g = product.nutrition.sugarPer100g;
  const proteinPer100g = product.nutrition.proteinPer100g;
  const fiberPer100g = product.nutrition.fiberPer100g;
  const saturatedFatPer100g = product.nutrition.saturatedFatPer100g;
  const caloriesPer100g = product.nutrition.caloriesPer100g;
  const fatPer100g = product.nutrition.fatPer100g;
  const additivesCount = product.additives.length;

  if (
    !ignoredFacts.has('protein') &&
    proteinPer100g !== null &&
    proteinPer100g >= thresholds.proteinPositiveMin
  ) {
    reasons.push(
      createReason({
        key: 'protein',
        label: 'Protein',
        description: 'High protein content',
        value: proteinPer100g,
        unit: 'g',
        impact: 12,
        kind: 'positive',
        source: 'nutrition',
        category: 'protein',
      }),
    );
  }

  if (
    !ignoredFacts.has('fiber') &&
    fiberPer100g !== null &&
    fiberPer100g >= thresholds.fiberPositiveMin
  ) {
    reasons.push(
      createReason({
        key: 'fiber',
        label: 'Fiber',
        description: 'Good fiber content',
        value: fiberPer100g,
        unit: 'g',
        impact: 10,
        kind: 'positive',
        source: 'nutrition',
        category: 'fiber',
      }),
    );
  }

  if (
    !ignoredFacts.has('sugar') &&
    sugarPer100g !== null &&
    sugarPer100g <= thresholds.sugarPositiveMax
  ) {
    reasons.push(
      createReason({
        key: 'sugar',
        label: 'Sugar',
        description: sugarPer100g === 0 ? 'No sugar' : 'Low sugar content',
        value: sugarPer100g,
        unit: 'g',
        impact: 10,
        kind: 'positive',
        source: 'nutrition',
        category: 'sugar',
      }),
    );
  }

  if (
    !ignoredFacts.has('sodium') &&
    saltPer100g !== null &&
    sodiumPer100g !== null &&
    sodiumPer100g <= thresholds.sodiumPositiveMax
  ) {
    reasons.push(
      createReason({
        key: 'salt',
        label: 'Salt',
        description: 'Low salt content',
        value: saltPer100g,
        unit: 'g',
        impact: 8,
        kind: 'positive',
        source: 'nutrition',
        category: 'salt',
      }),
    );
  }

  if (
    !ignoredFacts.has('unsaturatedFatRatio') &&
    hasMeaningfulUnsaturatedFatHighlight(rule, product.nutrition)
  ) {
    reasons.push(
      createReason({
        key: 'fat',
        label: 'Fat',
        description: 'High unsaturated fat',
        value: fatPer100g,
        unit: 'g',
        impact: 6,
        kind: 'positive',
        source: 'nutrition',
        category: 'fat',
      }),
    );
  }

  if (!ignoredFacts.has('additives') && additivesCount === 0 && product.ingredients.length > 0) {
    reasons.push(
      createReason({
        key: 'additives',
        label: 'Additives',
        description: 'No additives',
        value: 0,
        unit: null,
        impact: 6,
        kind: 'positive',
        source: 'ingredient',
        category: 'additives',
      }),
    );
  }

  if (
    !ignoredFacts.has('sugar') &&
    sugarPer100g !== null &&
    sugarPer100g >= thresholds.sugarNegativeMin
  ) {
    reasons.push(
      createReason({
        key: 'sugar',
        label: 'Sugar',
        description:
          sugarPer100g >= thresholds.sugarStrongNegativeMin
            ? 'Very high sugar content'
            : 'High sugar content',
        value: sugarPer100g,
        unit: 'g',
        impact: sugarPer100g >= thresholds.sugarStrongNegativeMin ? -16 : -10,
        kind: 'negative',
        source: 'nutrition',
        category: 'sugar',
      }),
    );
  }

  if (
    !ignoredFacts.has('sodium') &&
    saltPer100g !== null &&
    sodiumPer100g !== null &&
    sodiumPer100g >= thresholds.sodiumNegativeMin
  ) {
    reasons.push(
      createReason({
        key: 'salt',
        label: 'Salt',
        description: 'High salt content',
        value: saltPer100g,
        unit: 'g',
        impact: -12,
        kind: 'negative',
        source: 'nutrition',
        category: 'salt',
      }),
    );
  }

  if (
    !ignoredFacts.has('saturatedFat') &&
    saturatedFatPer100g !== null &&
    saturatedFatPer100g >= thresholds.saturatedFatNegativeMin
  ) {
    reasons.push(
      createReason({
        key: 'saturated-fat',
        label: 'Saturated fat',
        description: 'High saturated fat',
        value: saturatedFatPer100g,
        unit: 'g',
        impact: -12,
        kind: 'negative',
        source: 'nutrition',
        category: 'saturated-fat',
      }),
    );
  }

  if (
    !ignoredFacts.has('calorieDensity') &&
    caloriesPer100g !== null &&
    caloriesPer100g >= thresholds.calorieDensityNegativeMin
  ) {
    reasons.push(
      createReason({
        key: 'calories',
        label: 'Calories',
        description: portionGuidanceFacts.has('calorieDensity')
          ? 'High calorie density, portion size matters'
          : 'High calorie density',
        value: caloriesPer100g,
        unit: 'kcal',
        impact: -8,
        kind: 'negative',
        source: 'nutrition',
        category: 'calories',
      }),
    );
  }

  if (!ignoredFacts.has('additives') && additivesCount >= thresholds.additivesNegativeMin) {
    reasons.push(
      createReason({
        key: 'additives',
        label: 'Additives',
        description:
          additivesCount >= thresholds.additivesStrongNegativeMin
            ? 'Multiple additives'
            : 'Contains several additives',
        value: additivesCount,
        unit: null,
        impact: additivesCount >= thresholds.additivesStrongNegativeMin ? -12 : -8,
        kind: 'negative',
        source: 'ingredient',
        category: 'additives',
      }),
    );
  }

  return reasons;
}
