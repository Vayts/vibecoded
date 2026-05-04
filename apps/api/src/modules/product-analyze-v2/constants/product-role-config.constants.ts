import type { ProductRole } from '../types/product-role.types.js';
import type {
  MetricIntensity,
  ProductRoleConfig,
  ProductRoleGroup,
  ProductScoringProfile,
  RoleScoreCapRule,
} from '../types/goal-fit.types.js';

const NONE: MetricIntensity = 'none';
const LOW: MetricIntensity = 'low';
const MEDIUM: MetricIntensity = 'medium';
const HIGH: MetricIntensity = 'high';

const SWEET_CAPS: RoleScoreCapRule[] = [
  { metric: 'caloriesPerServing', gte: 220, maxScore: 45 },
  { metric: 'sugarPer100g', gte: 25, maxScore: 45 },
  { metric: 'caloriesPerServing', gte: 150, maxScore: 55 },
  { metric: 'sugarPer100g', gte: 15, maxScore: 55 },
];

const SUGARY_DRINK_CAPS: RoleScoreCapRule[] = [
  { metric: 'sugarPer100g', gte: 10, maxScore: 35 },
  { metric: 'sugarPer100g', gte: 5, maxScore: 50 },
];

const SAVORY_SNACK_CAPS: RoleScoreCapRule[] = [
  { metric: 'caloriesPerServing', gte: 200, maxScore: 50 },
  { metric: 'caloriesPerServing', gte: 150, maxScore: 60 },
];

const reward = (overrides: Partial<ProductRoleConfig['reward']>): ProductRoleConfig['reward'] => ({
  protein: NONE,
  fiber: NONE,
  lowSugar: NONE,
  lowSodium: NONE,
  lowSaturatedFat: NONE,
  goodFatProfile: NONE,
  lowAdditives: NONE,
  ...overrides,
});

const penalize = (
  overrides: Partial<ProductRoleConfig['penalize']>,
): ProductRoleConfig['penalize'] => ({
  calories: NONE,
  sugar: NONE,
  sodium: NONE,
  saturatedFat: NONE,
  fat: NONE,
  additives: NONE,
  ...overrides,
});

function createRoleConfig(
  role: ProductRole,
  group: ProductRoleGroup,
  scoringProfile: ProductScoringProfile,
  config: Omit<ProductRoleConfig, 'role' | 'group' | 'scoringProfile'>,
): ProductRoleConfig {
  return {
    role,
    group,
    scoringProfile,
    ...config,
  };
}

const PROTEIN_BASE = {
  useServingSize: false,
  reward: reward({ protein: HIGH, lowSugar: LOW, lowSodium: LOW, lowAdditives: MEDIUM }),
  penalize: penalize({ calories: LOW, sodium: MEDIUM, saturatedFat: MEDIUM, additives: MEDIUM }),
};

const DAIRY_BASE = {
  useServingSize: false,
  reward: reward({ protein: MEDIUM, lowSugar: LOW, lowSaturatedFat: LOW, lowAdditives: LOW }),
  penalize: penalize({
    calories: LOW,
    sugar: MEDIUM,
    sodium: LOW,
    saturatedFat: MEDIUM,
    additives: LOW,
  }),
};

const GRAIN_BASE = {
  useServingSize: false,
  reward: reward({ fiber: MEDIUM, lowSugar: LOW, lowSodium: LOW, lowAdditives: LOW }),
  penalize: penalize({
    calories: MEDIUM,
    sugar: MEDIUM,
    sodium: MEDIUM,
    saturatedFat: LOW,
    additives: LOW,
  }),
};

const PLANT_BASE = {
  useServingSize: false,
  reward: reward({ fiber: HIGH, lowSugar: LOW, lowSodium: MEDIUM, lowAdditives: MEDIUM }),
  penalize: penalize({
    calories: LOW,
    sugar: LOW,
    sodium: MEDIUM,
    saturatedFat: LOW,
    additives: LOW,
  }),
};

const DRINK_BASE = {
  useServingSize: true,
  reward: reward({ lowSugar: LOW, lowSodium: MEDIUM, lowAdditives: LOW }),
  penalize: penalize({ calories: MEDIUM, sugar: HIGH, sodium: LOW, additives: MEDIUM }),
};

const PREPARED_BASE = {
  useServingSize: true,
  reward: reward({ protein: MEDIUM, fiber: MEDIUM, lowSugar: LOW, lowAdditives: LOW }),
  penalize: penalize({
    calories: HIGH,
    sugar: MEDIUM,
    sodium: HIGH,
    saturatedFat: HIGH,
    additives: HIGH,
  }),
};

export const PRODUCT_ROLE_CONFIG: Record<ProductRole, ProductRoleConfig> = {
  generic_food: createRoleConfig('generic_food', 'fallback', 'generic', {
    useServingSize: false,
    reward: reward({
      protein: LOW,
      fiber: LOW,
      lowSugar: LOW,
      lowSodium: LOW,
      lowSaturatedFat: LOW,
      lowAdditives: LOW,
    }),
    penalize: penalize({
      calories: MEDIUM,
      sugar: MEDIUM,
      sodium: MEDIUM,
      saturatedFat: MEDIUM,
      fat: LOW,
      additives: MEDIUM,
    }),
  }),
  lean_protein: createRoleConfig('lean_protein', 'protein', 'lean_protein', PROTEIN_BASE),
  fatty_protein: createRoleConfig('fatty_protein', 'protein', 'fatty_protein', {
    ...PROTEIN_BASE,
    reward: reward({ protein: HIGH, goodFatProfile: MEDIUM, lowAdditives: MEDIUM }),
    penalize: penalize({
      calories: MEDIUM,
      sodium: MEDIUM,
      saturatedFat: HIGH,
      fat: LOW,
      additives: MEDIUM,
    }),
  }),
  processed_meat: createRoleConfig('processed_meat', 'protein', 'processed_protein', {
    useServingSize: false,
    reward: reward({ protein: HIGH }),
    penalize: penalize({
      calories: MEDIUM,
      sodium: HIGH,
      saturatedFat: HIGH,
      fat: MEDIUM,
      additives: HIGH,
    }),
  }),
  seafood: createRoleConfig('seafood', 'protein', 'lean_protein', {
    ...PROTEIN_BASE,
    reward: reward({ protein: HIGH, goodFatProfile: MEDIUM, lowAdditives: HIGH }),
    penalize: penalize({ calories: LOW, sodium: MEDIUM, saturatedFat: LOW, additives: LOW }),
  }),
  egg_product: createRoleConfig('egg_product', 'protein', 'lean_protein', {
    ...PROTEIN_BASE,
    reward: reward({ protein: HIGH, lowSugar: MEDIUM, lowAdditives: MEDIUM }),
    penalize: penalize({ calories: LOW, sodium: LOW, saturatedFat: MEDIUM, additives: LOW }),
  }),
  plant_based_protein: createRoleConfig('plant_based_protein', 'protein', 'lean_protein', {
    ...PROTEIN_BASE,
    reward: reward({ protein: HIGH, fiber: MEDIUM, lowSugar: MEDIUM, lowAdditives: LOW }),
    penalize: penalize({ calories: LOW, sodium: MEDIUM, saturatedFat: LOW, additives: MEDIUM }),
  }),
  tofu_tempeh_seitan: createRoleConfig('tofu_tempeh_seitan', 'protein', 'lean_protein', {
    ...PROTEIN_BASE,
    reward: reward({
      protein: HIGH,
      fiber: LOW,
      lowSugar: HIGH,
      goodFatProfile: LOW,
      lowAdditives: MEDIUM,
    }),
    penalize: penalize({ calories: LOW, sodium: MEDIUM, saturatedFat: LOW, additives: LOW }),
  }),
  milk_plain: createRoleConfig('milk_plain', 'dairy', 'dairy', DAIRY_BASE),
  yogurt_plain: createRoleConfig('yogurt_plain', 'dairy', 'dairy', {
    ...DAIRY_BASE,
    reward: reward({ protein: MEDIUM, lowSugar: MEDIUM, lowAdditives: MEDIUM }),
  }),
  yogurt_sweetened: createRoleConfig('yogurt_sweetened', 'dairy', 'dairy', {
    ...DAIRY_BASE,
    reward: reward({ protein: MEDIUM, lowAdditives: LOW }),
    penalize: penalize({
      calories: LOW,
      sugar: HIGH,
      sodium: LOW,
      saturatedFat: MEDIUM,
      additives: MEDIUM,
    }),
  }),
  dairy_high_protein: createRoleConfig('dairy_high_protein', 'dairy', 'dairy', {
    ...DAIRY_BASE,
    reward: reward({ protein: HIGH, lowSugar: MEDIUM, lowSaturatedFat: MEDIUM, lowAdditives: LOW }),
    penalize: penalize({
      calories: LOW,
      sugar: MEDIUM,
      sodium: MEDIUM,
      saturatedFat: MEDIUM,
      additives: LOW,
    }),
  }),
  cheese: createRoleConfig('cheese', 'dairy', 'dairy', {
    useServingSize: false,
    reward: reward({ protein: MEDIUM, lowAdditives: LOW }),
    penalize: penalize({
      calories: MEDIUM,
      sodium: HIGH,
      saturatedFat: HIGH,
      fat: LOW,
      additives: LOW,
    }),
  }),
  butter_cream: createRoleConfig('butter_cream', 'dairy', 'fat', {
    useServingSize: true,
    reward: reward({ goodFatProfile: LOW, lowAdditives: LOW }),
    penalize: penalize({ calories: MEDIUM, sodium: LOW, saturatedFat: HIGH, additives: LOW }),
  }),
  whole_grain: createRoleConfig('whole_grain', 'grain_starch', 'grain', GRAIN_BASE),
  refined_grain: createRoleConfig('refined_grain', 'grain_starch', 'grain', {
    ...GRAIN_BASE,
    reward: reward({ fiber: LOW, lowSugar: LOW, lowSodium: LOW }),
  }),
  pasta_noodles: createRoleConfig('pasta_noodles', 'grain_starch', 'grain', {
    ...GRAIN_BASE,
    useServingSize: true,
    reward: reward({ fiber: LOW, protein: LOW, lowSugar: MEDIUM, lowAdditives: LOW }),
  }),
  starchy_food: createRoleConfig('starchy_food', 'grain_starch', 'grain', {
    ...GRAIN_BASE,
    reward: reward({ fiber: MEDIUM, lowSugar: MEDIUM, lowSodium: MEDIUM, lowAdditives: MEDIUM }),
  }),
  breakfast_cereal: createRoleConfig('breakfast_cereal', 'grain_starch', 'grain', {
    ...GRAIN_BASE,
    reward: reward({ fiber: HIGH, protein: LOW, lowAdditives: LOW }),
    penalize: penalize({
      calories: MEDIUM,
      sugar: HIGH,
      sodium: MEDIUM,
      saturatedFat: LOW,
      additives: MEDIUM,
    }),
  }),
  bakery_bread: createRoleConfig('bakery_bread', 'grain_starch', 'grain', {
    ...GRAIN_BASE,
    reward: reward({ fiber: MEDIUM, lowAdditives: LOW }),
    penalize: penalize({
      calories: MEDIUM,
      sugar: LOW,
      sodium: HIGH,
      saturatedFat: LOW,
      additives: LOW,
    }),
  }),
  pastry_sweet_bakery: createRoleConfig('pastry_sweet_bakery', 'grain_starch', 'sweet', {
    useServingSize: true,
    reward: reward({ fiber: LOW }),
    penalize: penalize({
      calories: HIGH,
      sugar: HIGH,
      sodium: LOW,
      saturatedFat: HIGH,
      additives: MEDIUM,
    }),
    caps: SWEET_CAPS,
    suppressLowRiskPositives: true,
  }),
  vegetable: createRoleConfig('vegetable', 'plant', 'plant', {
    ...PLANT_BASE,
    reward: reward({
      protein: LOW,
      fiber: HIGH,
      lowSugar: MEDIUM,
      lowSodium: HIGH,
      lowSaturatedFat: HIGH,
      lowAdditives: HIGH,
    }),
    penalize: penalize({ sodium: MEDIUM, additives: MEDIUM }),
  }),
  fruit: createRoleConfig('fruit', 'plant', 'plant', {
    ...PLANT_BASE,
    reward: reward({ fiber: MEDIUM, lowSodium: HIGH, lowSaturatedFat: HIGH, lowAdditives: HIGH }),
    penalize: penalize({ calories: LOW, sugar: LOW, additives: LOW }),
  }),
  dried_fruit: createRoleConfig('dried_fruit', 'plant', 'plant', {
    ...PLANT_BASE,
    reward: reward({ fiber: MEDIUM, lowSodium: MEDIUM, lowAdditives: MEDIUM }),
    penalize: penalize({
      calories: MEDIUM,
      sugar: HIGH,
      sodium: LOW,
      saturatedFat: LOW,
      additives: LOW,
    }),
  }),
  legume: createRoleConfig('legume', 'plant', 'plant', {
    ...PLANT_BASE,
    reward: reward({
      protein: MEDIUM,
      fiber: HIGH,
      lowSugar: HIGH,
      lowSodium: MEDIUM,
      lowSaturatedFat: HIGH,
      lowAdditives: MEDIUM,
    }),
  }),
  nuts_seeds: createRoleConfig('nuts_seeds', 'plant', 'plant', {
    ...PLANT_BASE,
    reward: reward({
      protein: MEDIUM,
      fiber: MEDIUM,
      lowSugar: LOW,
      lowSodium: MEDIUM,
      goodFatProfile: HIGH,
      lowAdditives: MEDIUM,
    }),
    penalize: penalize({
      calories: MEDIUM,
      sugar: LOW,
      sodium: MEDIUM,
      saturatedFat: MEDIUM,
      additives: LOW,
    }),
  }),
  nut_seed_spread: createRoleConfig('nut_seed_spread', 'plant', 'plant', {
    ...PLANT_BASE,
    useServingSize: true,
    reward: reward({ protein: MEDIUM, fiber: LOW, goodFatProfile: HIGH, lowAdditives: LOW }),
    penalize: penalize({
      calories: MEDIUM,
      sugar: MEDIUM,
      sodium: MEDIUM,
      saturatedFat: MEDIUM,
      additives: MEDIUM,
    }),
  }),
  oil: createRoleConfig('oil', 'fat', 'fat', {
    useServingSize: true,
    reward: reward({ goodFatProfile: HIGH, lowSaturatedFat: LOW, lowAdditives: MEDIUM }),
    penalize: penalize({ calories: MEDIUM, sodium: LOW, saturatedFat: HIGH, additives: LOW }),
  }),
  spread_fat: createRoleConfig('spread_fat', 'fat', 'fat', {
    useServingSize: true,
    reward: reward({ goodFatProfile: MEDIUM, lowAdditives: LOW }),
    penalize: penalize({ calories: MEDIUM, sodium: LOW, saturatedFat: HIGH, additives: MEDIUM }),
  }),
  savory_snack: createRoleConfig('savory_snack', 'snack_sweet', 'snack', {
    useServingSize: true,
    reward: reward({ protein: LOW, fiber: MEDIUM }),
    penalize: penalize({
      calories: HIGH,
      sugar: LOW,
      sodium: HIGH,
      saturatedFat: MEDIUM,
      fat: LOW,
      additives: HIGH,
    }),
    caps: SAVORY_SNACK_CAPS,
    suppressLowRiskPositives: true,
  }),
  sweet_snack: createRoleConfig('sweet_snack', 'snack_sweet', 'sweet', {
    useServingSize: true,
    reward: reward({ fiber: LOW }),
    penalize: penalize({
      calories: HIGH,
      sugar: HIGH,
      sodium: LOW,
      saturatedFat: HIGH,
      fat: MEDIUM,
      additives: HIGH,
    }),
    caps: SWEET_CAPS,
    suppressLowRiskPositives: true,
  }),
  dessert: createRoleConfig('dessert', 'snack_sweet', 'sweet', {
    useServingSize: true,
    reward: reward({ fiber: LOW }),
    penalize: penalize({
      calories: HIGH,
      sugar: HIGH,
      sodium: LOW,
      saturatedFat: HIGH,
      fat: MEDIUM,
      additives: HIGH,
    }),
    caps: SWEET_CAPS,
    suppressLowRiskPositives: true,
  }),
  candy_chocolate: createRoleConfig('candy_chocolate', 'snack_sweet', 'sweet', {
    useServingSize: true,
    reward: reward({ fiber: LOW }),
    penalize: penalize({
      calories: HIGH,
      sugar: HIGH,
      sodium: LOW,
      saturatedFat: HIGH,
      fat: MEDIUM,
      additives: HIGH,
    }),
    caps: SWEET_CAPS,
    suppressLowRiskPositives: true,
  }),
  ice_cream_frozen_dessert: createRoleConfig('ice_cream_frozen_dessert', 'snack_sweet', 'sweet', {
    useServingSize: true,
    reward: reward({}),
    penalize: penalize({
      calories: HIGH,
      sugar: HIGH,
      sodium: LOW,
      saturatedFat: HIGH,
      fat: MEDIUM,
      additives: HIGH,
    }),
    caps: SWEET_CAPS,
    suppressLowRiskPositives: true,
  }),
  water: createRoleConfig('water', 'drink', 'drink', {
    ...DRINK_BASE,
    reward: reward({ lowSodium: HIGH, lowAdditives: HIGH }),
    penalize: penalize({ calories: MEDIUM, sodium: LOW, additives: MEDIUM }),
  }),
  unsweetened_drink: createRoleConfig('unsweetened_drink', 'drink', 'drink', {
    ...DRINK_BASE,
    reward: reward({ lowSugar: MEDIUM, lowSodium: MEDIUM, lowAdditives: MEDIUM }),
    penalize: penalize({ calories: LOW, sugar: LOW, sodium: LOW, additives: MEDIUM }),
  }),
  sugary_drink: createRoleConfig('sugary_drink', 'drink', 'drink', {
    ...DRINK_BASE,
    reward: reward({}),
    penalize: penalize({ calories: MEDIUM, sugar: HIGH, sodium: LOW, additives: HIGH }),
    caps: SUGARY_DRINK_CAPS,
    suppressLowRiskPositives: true,
  }),
  diet_sweetened_drink: createRoleConfig('diet_sweetened_drink', 'drink', 'drink', {
    ...DRINK_BASE,
    reward: reward({ lowAdditives: LOW }),
    penalize: penalize({ sodium: LOW, additives: HIGH }),
    suppressLowRiskPositives: true,
  }),
  juice_smoothie: createRoleConfig('juice_smoothie', 'drink', 'drink', {
    ...DRINK_BASE,
    reward: reward({ fiber: LOW, lowAdditives: MEDIUM }),
    penalize: penalize({ calories: MEDIUM, sugar: HIGH, sodium: LOW, additives: MEDIUM }),
  }),
  milk_based_drink: createRoleConfig('milk_based_drink', 'drink', 'drink', {
    ...DRINK_BASE,
    reward: reward({ protein: MEDIUM, lowAdditives: LOW }),
    penalize: penalize({ calories: MEDIUM, sugar: HIGH, saturatedFat: MEDIUM, additives: MEDIUM }),
  }),
  sports_energy_drink: createRoleConfig('sports_energy_drink', 'drink', 'drink', {
    ...DRINK_BASE,
    reward: reward({}),
    penalize: penalize({ calories: MEDIUM, sugar: HIGH, sodium: MEDIUM, additives: HIGH }),
    suppressLowRiskPositives: true,
  }),
  sauce_condiment: createRoleConfig('sauce_condiment', 'condiment', 'condiment', {
    useServingSize: true,
    reward: reward({ lowSugar: LOW, lowAdditives: LOW }),
    penalize: penalize({
      calories: MEDIUM,
      sugar: HIGH,
      sodium: HIGH,
      saturatedFat: MEDIUM,
      fat: LOW,
      additives: HIGH,
    }),
    suppressLowRiskPositives: true,
  }),
  dressing_marinade: createRoleConfig('dressing_marinade', 'condiment', 'condiment', {
    useServingSize: true,
    reward: reward({ goodFatProfile: LOW, lowAdditives: LOW }),
    penalize: penalize({
      calories: MEDIUM,
      sugar: MEDIUM,
      sodium: HIGH,
      saturatedFat: MEDIUM,
      additives: HIGH,
    }),
    suppressLowRiskPositives: true,
  }),
  soup_broth: createRoleConfig('soup_broth', 'condiment', 'condiment', {
    useServingSize: true,
    reward: reward({ protein: LOW, fiber: LOW, lowSugar: LOW, lowAdditives: LOW }),
    penalize: penalize({
      calories: LOW,
      sugar: LOW,
      sodium: HIGH,
      saturatedFat: MEDIUM,
      additives: MEDIUM,
    }),
  }),
  seasoning_spice: createRoleConfig('seasoning_spice', 'condiment', 'condiment', {
    useServingSize: true,
    reward: reward({ lowAdditives: MEDIUM }),
    penalize: penalize({ sodium: HIGH, additives: MEDIUM }),
    suppressLowRiskPositives: true,
  }),
  sweetener: createRoleConfig('sweetener', 'condiment', 'condiment', {
    useServingSize: true,
    reward: reward({ lowAdditives: LOW }),
    penalize: penalize({ sugar: HIGH, additives: HIGH }),
    suppressLowRiskPositives: true,
  }),
  ready_meal: createRoleConfig('ready_meal', 'prepared', 'prepared_meal', PREPARED_BASE),
  instant_food: createRoleConfig('instant_food', 'prepared', 'prepared_meal', {
    ...PREPARED_BASE,
    penalize: penalize({
      calories: MEDIUM,
      sugar: LOW,
      sodium: HIGH,
      saturatedFat: MEDIUM,
      additives: HIGH,
    }),
  }),
  canned_packaged_food: createRoleConfig('canned_packaged_food', 'prepared', 'prepared_meal', {
    ...PREPARED_BASE,
    reward: reward({ protein: LOW, fiber: LOW, lowSugar: LOW, lowAdditives: LOW }),
    penalize: penalize({
      calories: MEDIUM,
      sugar: MEDIUM,
      sodium: HIGH,
      saturatedFat: MEDIUM,
      additives: MEDIUM,
    }),
  }),
  meal_replacement: createRoleConfig('meal_replacement', 'prepared', 'prepared_meal', {
    ...PREPARED_BASE,
    reward: reward({
      protein: HIGH,
      fiber: HIGH,
      lowSugar: MEDIUM,
      lowSodium: MEDIUM,
      lowSaturatedFat: MEDIUM,
    }),
    penalize: penalize({
      calories: MEDIUM,
      sugar: HIGH,
      sodium: MEDIUM,
      saturatedFat: MEDIUM,
      additives: HIGH,
    }),
  }),
  protein_powder: createRoleConfig('protein_powder', 'supplement', 'supplement', {
    useServingSize: true,
    reward: reward({ protein: HIGH, lowSugar: MEDIUM, lowSodium: MEDIUM, lowAdditives: LOW }),
    penalize: penalize({
      calories: LOW,
      sugar: MEDIUM,
      sodium: MEDIUM,
      saturatedFat: LOW,
      additives: MEDIUM,
    }),
  }),
  protein_bar: createRoleConfig('protein_bar', 'supplement', 'supplement', {
    useServingSize: true,
    reward: reward({ protein: HIGH, fiber: HIGH }),
    penalize: penalize({
      calories: HIGH,
      sugar: HIGH,
      sodium: MEDIUM,
      saturatedFat: MEDIUM,
      additives: HIGH,
    }),
    suppressLowRiskPositives: true,
  }),
  supplement: createRoleConfig('supplement', 'supplement', 'supplement', {
    useServingSize: true,
    reward: reward({ lowAdditives: LOW }),
    penalize: penalize({ sugar: LOW, sodium: LOW, additives: MEDIUM }),
  }),
  baby_food: createRoleConfig('baby_food', 'baby', 'baby_food', {
    useServingSize: true,
    reward: reward({ lowSugar: MEDIUM, lowSodium: HIGH, lowAdditives: HIGH }),
    penalize: penalize({ calories: LOW, sugar: HIGH, sodium: HIGH, additives: HIGH }),
  }),
};
