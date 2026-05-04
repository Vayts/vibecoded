import type { MainGoal } from '../types/scoring.types.js';
import type { ProductRole } from '../types/product-role.types.js';

export type GoalRoleWeightKey =
  | 'caloriesPerServing'
  | 'protein'
  | 'sugar'
  | 'fiber'
  | 'saturatedFat'
  | 'sodium'
  | 'additives'
  | 'unsaturatedFatRatio';

export type GoalRoleWeights = Partial<Record<GoalRoleWeightKey, number>>;

type GoalRoleTable = Partial<Record<ProductRole, GoalRoleWeights>>;
type WeightTable = Record<string, GoalRoleTable>;

const WEIGHTS: WeightTable = {
  WEIGHT_LOSS: {
    generic_food: {
      caloriesPerServing: 0.3,
      protein: 0.25,
      sugar: 0.2,
      fiber: 0.15,
      saturatedFat: 0.1,
    },
    oil: {
      caloriesPerServing: 0.35,
      unsaturatedFatRatio: 0.35,
      saturatedFat: 0.2,
      sodium: 0.05,
      additives: 0.05,
    },
    sugary_drink: { caloriesPerServing: 0.5, sugar: 0.3, sodium: 0.1, additives: 0.1 },
    lean_protein: { protein: 0.4, saturatedFat: 0.25, sodium: 0.2, caloriesPerServing: 0.15 },
    sweet_snack: { caloriesPerServing: 0.35, sugar: 0.35, saturatedFat: 0.2, additives: 0.1 },
    savory_snack: { caloriesPerServing: 0.3, sodium: 0.3, saturatedFat: 0.25, additives: 0.15 },
    ready_meal: {
      caloriesPerServing: 0.3,
      protein: 0.2,
      sodium: 0.25,
      sugar: 0.15,
      saturatedFat: 0.1,
    },
  },
  MUSCLE_GAIN: {
    generic_food: {
      protein: 0.4,
      caloriesPerServing: 0.2,
      sugar: 0.15,
      sodium: 0.15,
      saturatedFat: 0.1,
    },
    oil: { unsaturatedFatRatio: 0.5, saturatedFat: 0.3, additives: 0.1, sodium: 0.1 },
    sugary_drink: { caloriesPerServing: 0.3, sugar: 0.4, additives: 0.2, sodium: 0.1 },
    lean_protein: { protein: 0.5, saturatedFat: 0.2, sodium: 0.2, caloriesPerServing: 0.1 },
    sweet_snack: { sugar: 0.4, caloriesPerServing: 0.3, additives: 0.2, saturatedFat: 0.1 },
    savory_snack: { protein: 0.3, sodium: 0.3, caloriesPerServing: 0.25, additives: 0.15 },
    ready_meal: {
      protein: 0.35,
      caloriesPerServing: 0.25,
      sodium: 0.2,
      saturatedFat: 0.1,
      sugar: 0.1,
    },
  },
  GENERAL_HEALTH: {
    generic_food: { sugar: 0.2, fiber: 0.2, protein: 0.2, sodium: 0.2, saturatedFat: 0.2 },
    oil: { unsaturatedFatRatio: 0.4, saturatedFat: 0.35, additives: 0.15, sodium: 0.1 },
    sugary_drink: { sugar: 0.4, caloriesPerServing: 0.3, additives: 0.2, sodium: 0.1 },
    lean_protein: {
      protein: 0.35,
      saturatedFat: 0.25,
      sodium: 0.2,
      additives: 0.1,
      caloriesPerServing: 0.1,
    },
    sweet_snack: { sugar: 0.35, saturatedFat: 0.25, caloriesPerServing: 0.25, additives: 0.15 },
    savory_snack: { sodium: 0.3, saturatedFat: 0.25, additives: 0.25, caloriesPerServing: 0.2 },
    ready_meal: { sodium: 0.25, sugar: 0.2, protein: 0.2, saturatedFat: 0.2, fiber: 0.15 },
  },
  DIABETES_CONTROL: {
    generic_food: {
      sugar: 0.35,
      fiber: 0.25,
      caloriesPerServing: 0.2,
      sodium: 0.1,
      saturatedFat: 0.1,
    },
    oil: { unsaturatedFatRatio: 0.4, saturatedFat: 0.35, additives: 0.15, sodium: 0.1 },
    sugary_drink: { sugar: 0.6, caloriesPerServing: 0.25, additives: 0.15 },
    lean_protein: {
      protein: 0.3,
      sugar: 0.25,
      saturatedFat: 0.2,
      sodium: 0.15,
      caloriesPerServing: 0.1,
    },
    sweet_snack: { sugar: 0.5, caloriesPerServing: 0.25, saturatedFat: 0.15, additives: 0.1 },
    savory_snack: { sodium: 0.3, sugar: 0.25, caloriesPerServing: 0.25, additives: 0.2 },
    ready_meal: {
      sugar: 0.3,
      sodium: 0.25,
      caloriesPerServing: 0.25,
      fiber: 0.1,
      saturatedFat: 0.1,
    },
  },
  PREGNANCY: {
    generic_food: { fiber: 0.25, protein: 0.25, sodium: 0.2, sugar: 0.15, saturatedFat: 0.15 },
    oil: { unsaturatedFatRatio: 0.45, saturatedFat: 0.3, additives: 0.15, sodium: 0.1 },
    sugary_drink: { sugar: 0.4, caloriesPerServing: 0.3, additives: 0.2, sodium: 0.1 },
    lean_protein: {
      protein: 0.4,
      saturatedFat: 0.2,
      sodium: 0.2,
      additives: 0.1,
      caloriesPerServing: 0.1,
    },
    sweet_snack: { sugar: 0.35, caloriesPerServing: 0.3, additives: 0.2, saturatedFat: 0.15 },
    savory_snack: { sodium: 0.35, saturatedFat: 0.25, additives: 0.2, caloriesPerServing: 0.2 },
    ready_meal: { sodium: 0.25, protein: 0.25, sugar: 0.2, saturatedFat: 0.15, fiber: 0.15 },
  },
};

const ROLES_WITH_EXPLICIT_WEIGHTS: ProductRole[] = [
  'generic_food',
  'oil',
  'sugary_drink',
  'lean_protein',
  'sweet_snack',
  'savory_snack',
  'ready_meal',
];

export function getGoalRoleWeights(goal: MainGoal | null, role: ProductRole): GoalRoleWeights {
  const goalKey = goal ?? 'GENERAL_HEALTH';
  const goalWeights = WEIGHTS[goalKey] ?? WEIGHTS.GENERAL_HEALTH;

  const effectiveRole: ProductRole = ROLES_WITH_EXPLICIT_WEIGHTS.includes(role)
    ? role
    : 'generic_food';
  return goalWeights[effectiveRole] ?? WEIGHTS.GENERAL_HEALTH.generic_food ?? {};
}
