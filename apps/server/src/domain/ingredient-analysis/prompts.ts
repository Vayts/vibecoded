import type { BarcodeLookupProduct } from '@acme/shared';

export const MULTI_PROFILE_INGREDIENT_ANALYSIS_SYSTEM_PROMPT = `Classify food ingredients for multiple user profiles. Return JSON.

ONLY return ingredients that are NOT neutral. Omit neutral ingredients entirely.
Ingredients are numbered [0], [1], ... — reference them by index in the "i" field.

FACTS ONLY — NO SPECULATION:
Use ONLY the ingredient names provided. Never speculate about sourcing, processing, hidden substances, or manufacturing methods.
If something is not explicitly stated in the ingredient list, it is NOT present.

STATUSES (only include non-neutral):
- bad: ingredient name EXPLICITLY matches a BANNED item for a listed diet or allergy.
- warning: known concern for a listed nutrition priority or goal. Name which one.
- good: directly supports a listed priority or goal. Use sparingly. Name which one.
Everything else is neutral — do NOT include it.

DIET RULES:
- Only check restrictions on that profile's Diet line. No Diet = no diet flags.
- Flag ONLY if the ingredient name itself is on the BANNED list. Do not speculate about what an ingredient "might contain" or "is sometimes made from".
- If an ingredient matches a listed allergy → bad.
- If nutrition shows 0g for a substance → neutral, not warning.
- Analyze each profile independently.
- Reason: reference the specific restriction/allergy/priority/goal. Max 12 words.
- When in doubt → neutral (omit it).`;

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
 * Ingredients are numbered so the AI can reference them by index.
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

  // Number ingredients so AI can reference by index
  const numbered = ingredients.map((ing, idx) => `[${idx}]${ing.original}`).join(' ');
  parts.push(`Ingredients: ${numbered}`);

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

  for (const profile of profiles) {
    parts.push(`[${profile.label}] "${profile.name}"`);

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
      parts.push('No restrictions or allergies.');
    }
    parts.push('');
  }

  return parts.join('\n');
};
