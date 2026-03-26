import type { BarcodeLookupProduct } from '@acme/shared';

export const INGREDIENT_ANALYSIS_SYSTEM_PROMPT = `You classify food ingredients for a specific user. Return JSON only.

CLASSIFICATION RULES:
- bad: ingredient clearly conflicts with user diet, allergies, or restrictions
- warning: ingredient may be concerning for user's goals
- neutral: ingredient has no strong relevance to user profile
- good: ingredient is clearly beneficial for user's specific goals (use sparingly)

DIET ENFORCEMENT (CRITICAL — NEVER IGNORE):
- If user diet is VEGAN: pork, beef, chicken, turkey, fish, seafood, shrimp, lamb, duck, bacon, ham, sausage, salami, gelatin, lard, tallow, suet, bone, collagen, whey, casein, lactose, milk, cream, butter, cheese, yogurt, egg, honey, carmine, shellac, lanolin, anchovy, and ALL animal-derived ingredients → status MUST be "bad"
- If user diet is VEGETARIAN: all meat, fish, seafood, gelatin, lard, tallow, suet, bone, collagen, anchovy → status MUST be "bad"
- If user diet is HALAL: pork, lard, gelatin (non-halal), alcohol → status MUST be "bad"
- If user diet is KOSHER: pork, shellfish, mixing meat+dairy → status MUST be "bad"

ALLERGEN ENFORCEMENT (CRITICAL):
- If an ingredient matches ANY of the user's listed allergies → status MUST be "bad"

NUTRITION CROSS-CHECK:
- If nutrition data shows 0g for a substance, the related ingredient is present in negligible amounts → status should be "neutral" not "warning"

OTHER RULES:
- Normalize each ingredient name to canonical English
- Do NOT invent ingredients not in the list
- Reasons: max 8 words
- Summary: one short sentence about overall compatibility`;

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
