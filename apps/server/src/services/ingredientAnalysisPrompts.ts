import type { BarcodeLookupProduct } from '@acme/shared';

export const INGREDIENT_ANALYSIS_SYSTEM_PROMPT = `You classify food ingredients for a specific user. Return JSON only.

DEFAULT RULE (MOST IMPORTANT):
- The DEFAULT status for every ingredient is "neutral". Only change it if you can cite a SPECIFIC conflict or benefit from the user's profile.
- If the user has NO dietary restrictions and NO allergies, almost ALL ingredients should be "neutral". Do NOT flag common food ingredients as "warning" or "bad" without a concrete reason tied to the user's profile.

CLASSIFICATION RULES:
- bad: ingredient DIRECTLY conflicts with a specific diet restriction or allergy listed in the user profile. You MUST name which restriction or allergy in the reason.
- warning: ingredient is a known concern for a specific nutrition priority or goal listed in the user profile. You MUST name which priority or goal in the reason.
- neutral: ingredient has no conflict with the user's restrictions, allergies, priorities, or goals. THIS IS THE DEFAULT.
- good: ingredient directly supports a specific nutrition priority or goal listed in the user profile. Use sparingly. You MUST name which priority or goal in the reason.

DIET ENFORCEMENT (CRITICAL — NEVER IGNORE):
- If user diet is VEGAN: pork, beef, chicken, turkey, fish, seafood, shrimp, lamb, duck, bacon, ham, sausage, salami, gelatin, lard, tallow, suet, bone, collagen, whey, casein, lactose, milk, cream, butter, cheese, yogurt, egg, honey, carmine, shellac, lanolin, anchovy, and ALL animal-derived ingredients → status MUST be "bad"
- If user diet is VEGETARIAN: all meat, fish, seafood, gelatin, lard, tallow, suet, bone, collagen, anchovy → status MUST be "bad"
- If user diet is HALAL: pork, lard, gelatin (non-halal), alcohol → status MUST be "bad"
- If user diet is KOSHER: pork, shellfish, mixing meat+dairy → status MUST be "bad"

ALLERGEN ENFORCEMENT (CRITICAL):
- If an ingredient matches ANY of the user's listed allergies → status MUST be "bad"
- If the user has NO allergies listed, do NOT flag ingredients as allergens

NUTRITION CROSS-CHECK:
- If nutrition data shows 0g for a substance, the related ingredient is present in negligible amounts → status should be "neutral" not "warning"

REASON FORMAT:
- Each reason MUST reference the specific profile attribute (restriction, allergy, priority, or goal) that justifies the status
- For "neutral" ingredients, reason should be "No conflict with profile"
- For "bad": e.g. "Contains gluten — conflicts with GLUTEN-FREE diet"
- For "warning": e.g. "High sodium — conflicts with LOW_SODIUM priority"
- For "good": e.g. "High fiber — supports WEIGHT_LOSS goal"
- Max 12 words

OTHER RULES:
- Normalize each ingredient name to canonical English
- Do NOT invent ingredients not in the list
- Summary: one short sentence about overall compatibility
- When in doubt, use "neutral" — do NOT guess or assume conflicts`;

export const MULTI_PROFILE_INGREDIENT_ANALYSIS_SYSTEM_PROMPT = `You classify food ingredients for MULTIPLE user profiles in a single response. Return JSON only.

DEFAULT RULE (MOST IMPORTANT):
- The DEFAULT status for every ingredient is "neutral". Only change it if you can cite a SPECIFIC conflict or benefit from THAT profile's attributes.
- If a profile has NO dietary restrictions and NO allergies, almost ALL ingredients should be "neutral" for that profile. Do NOT flag common food ingredients without a concrete reason tied to that profile.

CLASSIFICATION RULES (apply per profile independently):
- bad: ingredient DIRECTLY conflicts with a specific diet restriction or allergy listed in THAT profile. You MUST name which restriction or allergy in the reason.
- warning: ingredient is a known concern for a specific nutrition priority or goal listed in THAT profile. You MUST name which priority or goal in the reason.
- neutral: ingredient has no conflict with that profile's restrictions, allergies, priorities, or goals. THIS IS THE DEFAULT.
- good: ingredient directly supports a specific nutrition priority or goal listed in THAT profile. Use sparingly. You MUST name which priority or goal in the reason.

DIET ENFORCEMENT (CRITICAL — NEVER IGNORE — apply per profile):
- If profile diet is VEGAN: pork, beef, chicken, turkey, fish, seafood, shrimp, lamb, duck, bacon, ham, sausage, salami, gelatin, lard, tallow, suet, bone, collagen, whey, casein, lactose, milk, cream, butter, cheese, yogurt, egg, honey, carmine, shellac, lanolin, anchovy, and ALL animal-derived ingredients → status MUST be "bad"
- If profile diet is VEGETARIAN: all meat, fish, seafood, gelatin, lard, tallow, suet, bone, collagen, anchovy → status MUST be "bad"
- If profile diet is HALAL: pork, lard, gelatin (non-halal), alcohol → status MUST be "bad"
- If profile diet is KOSHER: pork, shellfish, mixing meat+dairy → status MUST be "bad"

ALLERGEN ENFORCEMENT (CRITICAL — apply per profile):
- If an ingredient matches ANY of that profile's listed allergies → status MUST be "bad"
- If the profile has NO allergies listed, do NOT flag ingredients as allergens

NUTRITION CROSS-CHECK:
- If nutrition data shows 0g for a substance, the related ingredient is present in negligible amounts → status should be "neutral" not "warning"

REASON FORMAT:
- Each reason MUST reference the specific profile attribute (restriction, allergy, priority, or goal) that justifies the status
- For "neutral" ingredients, reason should be "No conflict with profile"
- For "bad": e.g. "Contains gluten — conflicts with GLUTEN-FREE diet"
- For "warning": e.g. "High sodium — conflicts with LOW_SODIUM priority"
- For "good": e.g. "High fiber — supports WEIGHT_LOSS goal"
- Max 12 words

OTHER RULES:
- Analyze the SAME ingredient list for EACH profile independently
- Normalize each ingredient name to canonical English
- Do NOT invent ingredients not in the list
- Summary: one short sentence about overall compatibility for that specific profile
- Return results for ALL profiles listed in the prompt
- When in doubt, use "neutral" — do NOT guess or assume conflicts`;

const RESTRICTION_LABELS: Record<string, string> = {
  VEGAN: 'VEGAN (no animal products at all)',
  VEGETARIAN: 'VEGETARIAN (no meat/fish/gelatin)',
  HALAL: 'HALAL',
  KOSHER: 'KOSHER',
  GLUTEN_FREE: 'GLUTEN-FREE',
  DAIRY_FREE: 'DAIRY-FREE',
  KETO: 'KETO (very low carb)',
  PALEO: 'PALEO',
  NUT_FREE: 'NUT-FREE',
};

const ALLERGY_LABELS: Record<string, string> = {
  PEANUTS: 'peanuts',
  TREE_NUTS: 'tree nuts (almonds, walnuts, cashews, hazelnuts, pistachios)',
  GLUTEN: 'gluten (wheat, barley, rye)',
  DAIRY: 'dairy (milk, whey, casein, lactose)',
  SOY: 'soy',
  EGGS: 'eggs',
  SHELLFISH: 'shellfish (shrimp, crab, lobster)',
  SESAME: 'sesame',
};

export const buildIngredientAnalysisPrompt = (
  product: BarcodeLookupProduct,
  ingredients: { original: string }[],
  userProfile: {
    restrictions: string[];
    allergies: string[];
    nutritionPriorities: string[];
    mainGoal: string | null;
  },
): string => {
  const parts: string[] = [];

  // Product context
  if (product.product_name) {
    parts.push(`Product: ${product.product_name}`);
  }

  parts.push(`Ingredients: ${ingredients.map((i) => i.original).join(', ')}`);

  // Nutrition context
  const nutritionFacts: string[] = [];
  const n = product.nutrition;
  if (n.sugars_100g !== null) nutritionFacts.push(`sugar:${n.sugars_100g}g`);
  if (n.salt_100g !== null) nutritionFacts.push(`salt:${n.salt_100g}g`);
  if (n.fat_100g !== null) nutritionFacts.push(`fat:${n.fat_100g}g`);
  if (n.proteins_100g !== null) nutritionFacts.push(`protein:${n.proteins_100g}g`);
  if (n.fiber_100g !== null) nutritionFacts.push(`fiber:${n.fiber_100g}g`);
  if (nutritionFacts.length > 0) {
    parts.push(`Nutrition/100g: ${nutritionFacts.join(', ')}`);
  }

  // User profile — explicit and human-readable
  parts.push('');
  parts.push('USER PROFILE:');

  if (userProfile.restrictions.length > 0) {
    const labels = userProfile.restrictions.map((r) => RESTRICTION_LABELS[r] ?? r);
    parts.push(`Diet: ${labels.join(', ')}`);
  }
  if (userProfile.allergies.length > 0) {
    const labels = userProfile.allergies.map((a) => ALLERGY_LABELS[a] ?? a);
    parts.push(`Allergies: ${labels.join(', ')}`);
  }
  if (userProfile.nutritionPriorities.length > 0) {
    parts.push(`Priorities: ${userProfile.nutritionPriorities.join(', ')}`);
  }
  if (userProfile.mainGoal) {
    parts.push(`Goal: ${userProfile.mainGoal}`);
  }

  if (userProfile.restrictions.length === 0 && userProfile.allergies.length === 0) {
    parts.push('No specific dietary restrictions or allergies.');
  }

  return parts.join('\n');
};

export interface ProfileForPrompt {
  label: string;
  name: string;
  restrictions: string[];
  allergies: string[];
  nutritionPriorities: string[];
  mainGoal: string | null;
}

/**
 * Build a single prompt that includes ALL profiles for batch ingredient analysis.
 * The AI returns results keyed by profile label (A, B, C, …).
 */
export const buildMultiProfileIngredientAnalysisPrompt = (
  product: BarcodeLookupProduct,
  ingredients: { original: string }[],
  profiles: ProfileForPrompt[],
): string => {
  const parts: string[] = [];

  if (product.product_name) {
    parts.push(`Product: ${product.product_name}`);
  }

  parts.push(`Ingredients: ${ingredients.map((i) => i.original).join(', ')}`);

  const nutritionFacts: string[] = [];
  const n = product.nutrition;
  if (n.sugars_100g !== null) nutritionFacts.push(`sugar:${n.sugars_100g}g`);
  if (n.salt_100g !== null) nutritionFacts.push(`salt:${n.salt_100g}g`);
  if (n.fat_100g !== null) nutritionFacts.push(`fat:${n.fat_100g}g`);
  if (n.proteins_100g !== null) nutritionFacts.push(`protein:${n.proteins_100g}g`);
  if (n.fiber_100g !== null) nutritionFacts.push(`fiber:${n.fiber_100g}g`);
  if (nutritionFacts.length > 0) {
    parts.push(`Nutrition/100g: ${nutritionFacts.join(', ')}`);
  }

  parts.push('');
  parts.push(`Analyze the ingredients above for EACH of the ${profiles.length} profiles below.`);
  parts.push('Return one entry per profile in the "profiles" array, using the exact profileLabel.');
  parts.push('');

  for (const profile of profiles) {
    parts.push(`=== PROFILE [${profile.label}] "${profile.name}" ===`);

    if (profile.restrictions.length > 0) {
      const labels = profile.restrictions.map((r) => RESTRICTION_LABELS[r] ?? r);
      parts.push(`Diet: ${labels.join(', ')}`);
    }
    if (profile.allergies.length > 0) {
      const labels = profile.allergies.map((a) => ALLERGY_LABELS[a] ?? a);
      parts.push(`Allergies: ${labels.join(', ')}`);
    }
    if (profile.nutritionPriorities.length > 0) {
      parts.push(`Priorities: ${profile.nutritionPriorities.join(', ')}`);
    }
    if (profile.mainGoal) {
      parts.push(`Goal: ${profile.mainGoal}`);
    }
    if (profile.restrictions.length === 0 && profile.allergies.length === 0) {
      parts.push('No specific dietary restrictions or allergies.');
    }
    parts.push('');
  }

  return parts.join('\n');
};
