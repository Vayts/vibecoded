// Allergen enum -> keywords to match in product allergen/trace strings
export const ALLERGY_KEYWORD_MAP: Record<string, string[]> = {
  PEANUTS: ['peanut', 'peanuts'],
  TREE_NUTS: [
    'tree nut',
    'tree nuts',
    'nut',
    'nuts',
    'almond',
    'walnut',
    'cashew',
    'hazelnut',
    'pistachio',
    'pecan',
    'macadamia',
    'brazil nut',
  ],
  GLUTEN: ['gluten', 'wheat', 'barley', 'rye', 'spelt', 'oat'],
  DAIRY: ['milk', 'dairy', 'lactose', 'casein', 'whey', 'cream', 'butter', 'cheese'],
  SOY: ['soy', 'soya', 'soybean'],
  EGGS: ['egg', 'eggs'],
  SHELLFISH: ['shellfish', 'crustacean', 'mollusc', 'shrimp', 'crab', 'lobster', 'prawn'],
  SESAME: ['sesame'],
  OTHER: [],
};

// Restriction enum -> ingredient/allergen keywords indicating a hard violation
export const RESTRICTION_KEYWORD_MAP: Record<string, string[]> = {
  VEGAN: [
    'meat',
    'chicken',
    'beef',
    'pork',
    'fish',
    'salmon',
    'tuna',
    'milk',
    'dairy',
    'egg',
    'honey',
    'gelatin',
    'lard',
    'collagen',
    'carmine',
  ],
  VEGETARIAN: [
    'meat',
    'chicken',
    'beef',
    'pork',
    'lamb',
    'fish',
    'salmon',
    'tuna',
    'gelatin',
    'lard',
    'collagen',
    'carmine',
  ],
  GLUTEN_FREE: ['gluten', 'wheat', 'barley', 'rye', 'spelt'],
  DAIRY_FREE: ['milk', 'dairy', 'lactose', 'casein', 'whey', 'cream', 'butter', 'cheese'],
  PORK_FREE: [
    'pork',
    'bacon',
    'ham',
    'lard',
    'prosciutto',
    'pancetta',
    'pork gelatin',
    'pork fat',
    'pork broth',
  ],
  NUT_FREE: ['peanut', 'almond', 'walnut', 'cashew', 'hazelnut', 'pistachio', 'pecan', 'nut'],
  KETO: [], // handled by carb threshold check
  PALEO: ['wheat', 'grain', 'oat', 'dairy', 'milk', 'soy', 'bean', 'legume'],
};

// Safety score thresholds
export const SAFETY_SCORE = {
  CONFIRMED_ALLERGEN: 0, // Final score when confirmed allergen match
  TRACE_ALLERGEN_PENALTY: 50,
  HARD_RESTRICTION_MAX_SCORE: 0,
  TRACE_RESTRICTION_MAX_SCORE: 40,
  UNCERTAIN_MATCH_PENALTY: 20,
  ADDITIVES_CAUTION_PENALTY: 10,
  ADDITIVES_HIGH_CONCERN_PENALTY: 20,
} as const;

export const ADDITIVES_SAFETY = {
  CAUTION_MIN_COUNT: 1,
  HIGH_CONCERN_MIN_COUNT: 3,
} as const;

// Carb threshold above which KETO restriction is considered violated (g per 100g)
export const KETO_CARB_THRESHOLD_G = 20;
