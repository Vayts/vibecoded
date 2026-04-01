import type { NormalizedProduct } from '@acme/shared';
import { z } from 'zod';
import type { ProfileInput } from '../../services/profileInputs';

const PROFILE_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const getProfileLabel = (index: number): string => PROFILE_LABELS[index] ?? `P${index}`;

export const personalAnalysisItemSchema = z.object({
  key: z.string().describe('Unique slug identifier, e.g. "sugar", "protein", "vegan-compatible"'),
  label: z.string().describe('Short display name, max 3 words, e.g. "Sugar", "Protein", "Vegan compatible"'),
  description: z.string().describe('One-line explanation, max 15 words, e.g. "Low sugar content fits your preference"'),
  overview: z.string().describe('1-2 sentence health-focused explanation for the user. Explain the real-world health impact — how this nutrient or ingredient affects their body, energy, or specific health goals. Never mention thresholds, scores, or internal ratings. Good example: "High sugar intake causes blood glucose spikes and increases risk of weight gain. With your low-sugar goal, this product may work against your progress." Bad example: "5g sugar is below the 10g good threshold."'),
  value: z.number().nullable().describe('Numeric nutrition value if applicable, else null'),
  unit: z.string().nullable().describe('Unit for value: "g", "kcal", "mg", etc. Null if no value'),
  per: z.enum(['100g']).nullable().describe('"100g" for nutrition facts, null for non-nutrition items'),
  severity: z.enum(['good', 'neutral', 'warning', 'bad']).describe('Severity level'),
  category: z.enum(['nutrition', 'diet', 'ingredients', 'restriction']).describe('Item category: nutrition for macro/micronutrients, restriction for dietary conflicts, diet for goal-related, ingredients for additive/ingredient concerns'),
  triggerIngredients: z.array(z.string()).nullable().describe('For restriction/diet/ingredients categories: the exact ingredient name(s) from the product ingredient list that caused this flag. Null for nutrition items.'),
});

export const personalProfileResultSchema = z.object({
  profileLabel: z.string().describe('The exact profile label from the prompt (e.g. "A", "B")'),
  fitScore: z.number().min(0).max(100).describe('Overall product suitability score 0-100'),
  fitLabel: z
    .enum(['great_fit', 'good_fit', 'neutral', 'poor_fit'])
    .describe('Categorical label for the fit score'),
  summary: z.string().describe('One sentence summary of product suitability for this profile'),
  positives: z
    .array(personalAnalysisItemSchema)
    .describe('Structured positive items — nutrition facts first, then restrictions/diet/ingredients'),
  negatives: z
    .array(personalAnalysisItemSchema)
    .describe('Structured negative items — nutrition facts first, then restrictions/diet/ingredients'),
});

export const multiProfilePersonalAnalysisOutputSchema = z.object({
  profiles: z.array(personalProfileResultSchema),
});

const RESTRICTION_LABELS: Record<string, string> = {
  VEGAN: 'VEGAN (no animal products at all)',
  VEGETARIAN: 'VEGETARIAN (no meat/fish/gelatin)',
  HALAL: 'HALAL (no pork, no alcohol, halal-certified meat only)',
  KOSHER: 'KOSHER (no pork, no shellfish, no meat+dairy mix)',
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

export const PERSONAL_ANALYSIS_SYSTEM_PROMPT = `You evaluate food product suitability for MULTIPLE user profiles. Return structured JSON only.

SCORING: fitScore 0-100. great_fit: 80-100, good_fit: 60-79, neutral: 40-59, poor_fit: 0-39.

═══ FACTS ONLY — NO SPECULATION ═══

You may ONLY use information explicitly provided in the product data (ingredients list, nutrition values, allergens, traces).
NEVER speculate about:
- How an ingredient is sourced, processed, or manufactured
- Hidden ingredients not listed
- Whether a product "might" contain something
- Production methods, cross-contamination, or certification status
If something is not stated in the data, assume it is NOT present.
Example: if "alcohol" is not in the ingredients → the product does NOT contain alcohol. Do NOT speculate that honey, vanilla, or any other ingredient "may contain" or "is sometimes processed with" alcohol.

═══ DIETARY RESTRICTIONS — CLOSED LISTS ═══

ONLY check restrictions in the profile's "Diet:" line. If no Diet → skip this section entirely.
An ingredient triggers ONLY the restriction whose BANNED list contains it. Never cross-attribute.

BENEFIT OF THE DOUBT:
An ingredient violates a diet ONLY if it is EXPLICITLY listed and GUARANTEED to conflict.
If an ingredient COULD be compatible or its source is ambiguous → NOT a violation.

BANNED = Tier 1 (fitScore=0, severity "bad"). Only DEFINITELY incompatible items that are EXPLICITLY in the ingredient list.
If no ingredient from the BANNED list appears in the product data → the product is compatible with that diet. No output.

KOSHER BANNED: pork, bacon, ham, lard, prosciutto, pancetta, shellfish, shrimp, crab, lobster, squid, octopus.

HALAL BANNED: pork, bacon, ham, lard, prosciutto, pancetta, alcohol, wine, beer, spirits.

VEGAN BANNED: meat, fish, shellfish, dairy, milk, cream, butter, cheese, whey, casein, eggs, honey, gelatin, lard, collagen, carmine, shellac.

VEGETARIAN BANNED: meat, fish, shellfish, gelatin, lard, collagen, carmine.

GLUTEN_FREE BANNED: wheat, barley, rye, spelt, semolina, bulgur, malt, seitan, farro, durum.

DAIRY_FREE BANNED: milk, cream, butter, ghee, cheese, yogurt, kefir, whey, casein, lactose, milk powder.

NUT_FREE BANNED: peanut, almond, walnut, cashew, hazelnut, pistachio, macadamia, pecan, brazil nut, pine nut, nut butter, nut oil, nut flour, praline, marzipan, gianduja.

KETO BANNED: bread, pasta, rice, cereals, crackers, potatoes, corn, legumes, sugar, syrup, candy, juice, soda, beer.

PALEO BANNED: grains, legumes, dairy, refined sugar, processed vegetable oils.

═══ ALLERGENS ═══

ONLY flag allergens listed in the profile's "Allergies:" line.
If an ingredient matches a listed allergy → fitScore 0-10.
If the profile has NO allergies → ignore allergen data entirely. Do NOT flag traces or allergens for a profile that has no allergies listed.
"Traces of X" or "may contain X" → only relevant if X matches a listed allergy. Otherwise ignore completely.

═══ NUTRITION ITEMS (category: "nutrition") ═══

Include ALL available core nutrients: sugar, salt, calories, fiber, protein, saturated-fat.
Use value from product data, unit ("g"/"kcal"), per: "100g".

Thresholds (per 100g):
Calories: ≤150→good, 150-300→neutral, 300-500→warning, >500→bad
Sugar: ≤5g→good, 5-10→neutral, 10-15→warning, >15→bad
Salt: ≤0.3g→good, 0.3-1→neutral, 1-1.5→warning, >1.5→bad
Sat fat: ≤1.5g→good, 1.5-3→neutral, 3-5→warning, >5→bad
Protein: ≥8g→good, 5-8→neutral, <5→warning (negatives only if HIGH_PROTEIN priority)
Fiber: ≥3g→good, 1-3→neutral, <1→warning (negatives only if HIGH_FIBER priority)

good→positives, neutral→skip, warning/bad→negatives. Thresholds are absolute regardless of diet.
Profile overrides: LOW_SODIUM → salt >0.5g warning, >1g bad. LOW_SUGAR/DIABETES → sugar >5g warning, >10g bad.

═══ RESTRICTION ITEMS (category: "restriction") ═══

Only when there IS a conflict. key: "restriction-{type}", label: diet name, description: which ingredient caused it.
Tier 1→"bad", Tier 2→"warning". Compatible→no output.
triggerIngredients: REQUIRED for restriction/diet/ingredients items — list the EXACT ingredient name(s) from the product's ingredient list that caused the flag. E.g. ["whey", "milk powder"] for a VEGAN violation. Empty array for nutrition items.

═══ OUTPUT ═══

Per profile: fitScore, fitLabel, summary (max 20 words), positives (max 5), negatives (max 5).
Each item needs: description (short, max 15 words) AND overview (1-2 sentences about the real health impact — how it affects the body, energy, or the user's specific goals. NEVER reference thresholds, numeric comparisons, or internal scoring. Write as if explaining to a health-conscious friend).
Order: nutrition first, then restriction, then diet/ingredients.
Analyze each profile INDEPENDENTLY.`;

export const buildPrompt = (product: NormalizedProduct, profiles: ProfileInput[]): string => {
  const parts: string[] = [];

  // Check if any profile has allergies — only include allergen/trace data if so
  const anyProfileHasAllergies = profiles.some(
    (p) => p.onboarding.allergies.length > 0 || !!p.onboarding.otherAllergiesText,
  );

  parts.push(`=== PRODUCT ===`);
  if (product.product_name) parts.push(`Name: ${product.product_name}`);
  if (product.brands) parts.push(`Brand: ${product.brands}`);
  if (product.categories) parts.push(`Categories: ${product.categories}`);

  if (product.ingredients.length > 0) {
    parts.push(`Ingredients: ${product.ingredients.slice(0, 30).join(', ')}`);
  } else if (product.ingredients_text) {
    parts.push(`Ingredients: ${product.ingredients_text.slice(0, 500)}`);
  }

  if (anyProfileHasAllergies && product.allergens.length > 0) {
    parts.push(`Allergens: ${product.allergens.join(', ')}`);
  }
  if (anyProfileHasAllergies && product.traces.length > 0) {
    parts.push(`Traces: ${product.traces.join(', ')}`);
  }

  const n = product.nutrition;
  const nutritionFacts: string[] = [];
  if (n.energy_kcal_100g !== null) nutritionFacts.push(`calories:${n.energy_kcal_100g}kcal`);
  if (n.proteins_100g !== null) nutritionFacts.push(`protein:${n.proteins_100g}g`);
  if (n.fat_100g !== null) nutritionFacts.push(`fat:${n.fat_100g}g`);
  if (n.saturated_fat_100g !== null) nutritionFacts.push(`saturated_fat:${n.saturated_fat_100g}g`);
  if (n.carbohydrates_100g !== null) nutritionFacts.push(`carbs:${n.carbohydrates_100g}g`);
  if (n.sugars_100g !== null) nutritionFacts.push(`sugar:${n.sugars_100g}g`);
  if (n.fiber_100g !== null) nutritionFacts.push(`fiber:${n.fiber_100g}g`);
  if (n.salt_100g !== null) nutritionFacts.push(`salt:${n.salt_100g}g`);
  if (n.sodium_100g !== null) nutritionFacts.push(`sodium:${n.sodium_100g}g`);
  if (nutritionFacts.length > 0) {
    parts.push(`Nutrition per 100g: ${nutritionFacts.join(', ')}`);
  }

  const s = product.scores;
  if (s.nutriscore_grade) parts.push(`Nutri-Score: ${s.nutriscore_grade.toUpperCase()}`);
  if (s.ecoscore_grade) parts.push(`Eco-Score: ${s.ecoscore_grade.toUpperCase()}`);

  parts.push('');
  parts.push(`Analyze this product for EACH of the ${profiles.length} profiles below.`);
  parts.push('Return one entry per profile using the exact profileLabel.');
  parts.push('');

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    const label = getProfileLabel(i);
    parts.push(`=== PROFILE [${label}] "${profile.profileName}" ===`);

    const ob = profile.onboarding;
    if (ob.restrictions.length > 0) {
      const labels = ob.restrictions.map((r) => RESTRICTION_LABELS[r] ?? r);
      parts.push(`Diet: ${labels.join(', ')}`);
    }
    if (ob.allergies.length > 0) {
      const labels = ob.allergies.map((a) => ALLERGY_LABELS[a] ?? a);
      parts.push(`Allergies: ${labels.join(', ')}`);
    }
    if (ob.otherAllergiesText) {
      parts.push(`Other allergies: ${ob.otherAllergiesText}`);
    }
    if (ob.nutritionPriorities.length > 0) {
      parts.push(`Priorities: ${ob.nutritionPriorities.join(', ')}`);
    }
    if (ob.mainGoal) {
      parts.push(`Goal: ${ob.mainGoal}`);
    }
    if (ob.restrictions.length === 0 && ob.allergies.length === 0) {
      parts.push('No specific dietary restrictions or allergies.');
    }
    parts.push('');
  }

  return parts.join('\n');
};
