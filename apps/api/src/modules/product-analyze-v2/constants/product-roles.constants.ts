import type { ProductRole } from '../types/product-role.types.js';

export const PRODUCT_ROLES: ProductRole[] = [
  'generic_food',
  'lean_protein',
  'fatty_protein',
  'processed_meat',
  'seafood',
  'egg_product',
  'dairy_high_protein',
  'whole_grain',
  'refined_grain',
  'starchy_food',
  'breakfast_cereal',
  'bakery',
  'oil',
  'nuts_seeds',
  'spread_fat',
  'vegetable',
  'fruit',
  'legume',
  'savory_snack',
  'sweet_snack',
  'dessert',
  'candy_chocolate',
  'water_unsweetened_drink',
  'sugary_drink',
  'juice_smoothie',
  'sauce_condiment',
  'sweetener',
  'supplement',
  'baby_food',
  'meal_replacement',
  'ready_meal',
];

export const PRODUCT_ROLE_SET: Set<string> = new Set(PRODUCT_ROLES);

export const FALLBACK_ROLE: ProductRole = 'generic_food';
export const MIN_AI_CONFIDENCE = 0.75;
