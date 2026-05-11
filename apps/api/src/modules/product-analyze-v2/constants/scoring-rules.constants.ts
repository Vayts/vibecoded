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
