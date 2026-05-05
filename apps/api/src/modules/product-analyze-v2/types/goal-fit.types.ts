import type { ProductRole } from './product-role.types.js';
import type { MainGoal } from './scoring.types.js';

export type MetricIntensity = 'none' | 'low' | 'medium' | 'high';

export type ProductRoleGroup =
  | 'fallback'
  | 'protein'
  | 'dairy'
  | 'grain_starch'
  | 'plant'
  | 'fat'
  | 'snack_sweet'
  | 'drink'
  | 'condiment'
  | 'prepared'
  | 'supplement'
  | 'baby';

export type ProductScoringProfile =
  | 'generic'
  | 'lean_protein'
  | 'fatty_protein'
  | 'processed_protein'
  | 'dairy'
  | 'grain'
  | 'plant'
  | 'fat'
  | 'snack'
  | 'sweet'
  | 'drink'
  | 'condiment'
  | 'prepared_meal'
  | 'supplement'
  | 'baby_food';

export interface NutrientSubScores {
  caloriesPerServing: number | null;
  calorieDensity: number | null;
  protein: number | null;
  sugar: number | null;
  fiber: number | null;
  fat: number | null;
  saturatedFat: number | null;
  sodium: number | null;
  additives: number | null;
  ingredientSimplicity: number | null;
  unsaturatedFatRatio: number | null;
}

export type GoalRoleWeightKey = keyof NutrientSubScores;
export type GoalRoleWeights = Partial<Record<GoalRoleWeightKey, number>>;

export type RoleScoreCapMetric =
  | 'caloriesPerServing'
  | 'sugarPer100g'
  | 'sodiumPer100g'
  | 'additivesCount'
  | 'saturatedFatPer100g';

export interface RoleScoreCapRule {
  metric: RoleScoreCapMetric;
  gte: number;
  maxScore: number;
  goals?: MainGoal[];
}

export interface AppliedCap extends RoleScoreCapRule {
  actual: number;
  scoreBeforeCap: number;
  scoreAfterCap: number;
}

export interface ProductRoleConfig {
  role: ProductRole;
  group: ProductRoleGroup;
  scoringProfile: ProductScoringProfile;
  useServingSize: boolean;
  reward: {
    protein: MetricIntensity;
    fiber: MetricIntensity;
    lowSugar: MetricIntensity;
    lowSodium: MetricIntensity;
    lowSaturatedFat: MetricIntensity;
    goodFatProfile: MetricIntensity;
    lowAdditives: MetricIntensity;
  };
  penalize: {
    calories: MetricIntensity;
    sugar: MetricIntensity;
    sodium: MetricIntensity;
    saturatedFat: MetricIntensity;
    fat: MetricIntensity;
    additives: MetricIntensity;
  };
  caps?: RoleScoreCapRule[];
  suppressLowRiskPositives?: boolean;
}
