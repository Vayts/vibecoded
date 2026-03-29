import type { NormalizedProduct } from '@acme/shared';
import { z } from 'zod';
import type { ProfileInput } from '../../services/profileInputs';

const PROFILE_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const getProfileLabel = (index: number): string => PROFILE_LABELS[index] ?? `P${index}`;

export const personalAnalysisItemSchema = z.object({
  key: z.string().describe('Unique slug identifier, e.g. "sugar", "protein", "vegan-compatible"'),
  label: z.string().describe('Short display name, max 3 words, e.g. "Sugar", "Protein", "Vegan compatible"'),
  description: z.string().describe('One-line explanation, max 15 words, e.g. "Low sugar content fits your preference"'),
  value: z.number().nullable().describe('Numeric nutrition value if applicable, else null'),
  unit: z.string().nullable().describe('Unit for value: "g", "kcal", "mg", etc. Null if no value'),
  per: z.enum(['100g']).nullable().describe('"100g" for nutrition facts, null for non-nutrition items'),
  severity: z.enum(['good', 'neutral', 'warning', 'bad']).describe('Severity level'),
  category: z.enum(['nutrition', 'diet', 'ingredients', 'restriction']).describe('Item category: nutrition for macro/micronutrients, restriction for dietary conflicts, diet for goal-related, ingredients for additive/ingredient concerns'),
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

export const PERSONAL_ANALYSIS_SYSTEM_PROMPT = `You evaluate how suitable a food product is for MULTIPLE user profiles. Return structured JSON only — no markdown, no prose.

SCORING RULES:
- fitScore 0-100: 0 = extremely bad for this person, 100 = perfect fit
- great_fit: 80-100, good_fit: 60-79, neutral: 40-59, poor_fit: 0-39
- Base score on nutrition quality, ingredient quality, and how well the product aligns with the person's specific profile

DIETARY RESTRICTION RULES — CLOSED INGREDIENT LISTS:

For each restriction listed in a profile's "Diet:" line, check the product's ingredients against the CLOSED LIST below.
ONLY ingredients explicitly listed under "BANNED" can cause Tier 1 (score=0). If an ingredient is NOT on the banned list, it can AT MOST be Tier 2 (warning). NEVER invent new Tier 1 violations.

────────────────────────────────
KOSHER — BANNED (Tier 1, fitScore=0, severity "bad"):
  pork, bacon, ham, lard, prosciutto, pancetta, chorizo (pork-based), pepperoni (pork-based),
  shellfish, shrimp, crab, lobster, crawfish, clam, mussel, oyster, scallop, squid, octopus,
  meat + dairy MIXED IN THE SAME PRODUCT (e.g. cheeseburger, meat lasagna with cheese).
KOSHER — SUSPECT (Tier 2, severity "warning", do NOT reduce fitScore):
  gelatin (unknown source), "animal fat" (unknown source), carmine, cochineal.
KOSHER — EVERYTHING ELSE IS FINE. Specifically OK:
  dairy alone, milk, cream, butter, cheese, yogurt, whey, eggs, honey, sugar, flour, oil, salt,
  cocoa, chocolate, vanilla, soy lecithin, yeast, vinegar, spices, nuts, seeds, fruits, vegetables,
  grains, wheat, fish, poultry, beef, lamb. A chocolate spread with milk is NOT a kosher problem.

────────────────────────────────
HALAL — BANNED (Tier 1, fitScore=0, severity "bad"):
  pork, bacon, ham, lard, prosciutto, pancetta, chorizo (pork-based), pepperoni (pork-based),
  alcohol, wine, beer, rum, vodka, whiskey, brandy, liqueur, sake,
  wine vinegar ONLY if listed as actual wine (regular vinegar is fine).
HALAL — SUSPECT (Tier 2, severity "warning", do NOT reduce fitScore):
  gelatin (unknown source), "animal fat" (unknown source), vanilla extract (may contain alcohol).
HALAL — EVERYTHING ELSE IS FINE. Specifically OK:
  dairy, milk, cream, butter, cheese, eggs, honey, sugar, flour, oil, salt, cocoa, chocolate,
  vanilla (flavoring), soy lecithin, vinegar, spices, nuts, seeds, fruits, vegetables, grains,
  fish, meat, poultry, beef, lamb. Meat is halal-permissible.

────────────────────────────────
VEGAN — BANNED (Tier 1, fitScore=0, severity "bad"):
  meat, beef, pork, chicken, turkey, lamb, duck, fish, salmon, tuna, anchovy, sardine,
  shrimp, crab, lobster, shellfish, squid, octopus,
  dairy, milk, cream, butter, cheese, yogurt, whey, casein, lactose,
  eggs, egg white, egg yolk,
  honey, beeswax, royal jelly,
  gelatin, lard, tallow, suet, collagen,
  carmine, cochineal, lanolin, shellac.
VEGAN — SUSPECT (Tier 2, severity "warning", do NOT reduce fitScore):
  "natural flavors" (sometimes animal-derived), vitamin D3 (sometimes from lanolin),
  mono- and diglycerides (sometimes animal-derived), L-cysteine.

────────────────────────────────
VEGETARIAN — BANNED (Tier 1, fitScore=0, severity "bad"):
  meat, beef, pork, chicken, turkey, lamb, duck,
  fish, salmon, tuna, anchovy, sardine,
  shrimp, crab, lobster, shellfish, squid, octopus,
  gelatin, lard, tallow, suet, collagen,
  carmine, cochineal.
VEGETARIAN — SUSPECT (Tier 2, severity "warning", do NOT reduce fitScore):
  "natural flavors" (sometimes animal-derived), "animal fat" (unknown source).

────────────────────────────────
GLUTEN_FREE — BANNED (Tier 1, fitScore=0, severity "bad"):
  wheat, barley, rye, spelt, kamut, triticale, semolina, couscous, bulgur,
  wheat flour, wheat starch, wheat gluten, malt, malt extract, malt vinegar,
  seitan, farro, durum.
GLUTEN_FREE — SUSPECT (Tier 2, severity "warning", do NOT reduce fitScore):
  oats (may be cross-contaminated), "modified food starch" (sometimes wheat-based).

────────────────────────────────
DAIRY_FREE — BANNED (Tier 1, fitScore=0, severity "bad"):
  milk, cream, butter, ghee, cheese, yogurt, kefir,
  whey, casein, caseinate, lactose, lactalbumin,
  milk powder, milk solids, milk fat, buttermilk, sour cream, ice cream.
DAIRY_FREE — SUSPECT (Tier 2, severity "warning", do NOT reduce fitScore):
  "natural flavors" (sometimes contain dairy derivatives), caramel color (rarely dairy-based).

────────────────────────────────
NUT_FREE — BANNED (Tier 1, fitScore=0, severity "bad"):
  peanut, peanut butter, peanut oil,
  almond, walnut, cashew, hazelnut, pistachio, macadamia, pecan, brazil nut, pine nut,
  mixed nuts, nut butter, nut oil, nut flour, praline, marzipan, nougat (nut-based), gianduja.
NUT_FREE — SUSPECT (Tier 2, severity "warning", do NOT reduce fitScore):
  "may contain traces of nuts" (cross-contamination), coconut (tree nut classification varies).

────────────────────────────────
ALLERGENS: if the product contains a listed allergen from the profile → fitScore 0-10.

TIER 3 — COMPATIBLE (no output):
When NO ingredients from the BANNED or SUSPECT lists are found → the product is compatible. Do NOT add any item. Simply skip this restriction entirely — no positive, no negative, nothing.

ABSOLUTE RULE: If an ingredient does NOT appear on a diet's BANNED list above, you MUST NOT classify it as Tier 1 for that diet. At most it can be Tier 2 (warning) if it's on the SUSPECT list. If it's on neither list, produce nothing for that restriction.

CRITICAL RULES:
- Each restriction produces AT MOST ONE item — a negative (Tier 1 or Tier 2). If compatible, produce nothing.
- Judge ONLY by the actual ingredients list. Missing certification does NOT mean conflict.
- Even when fitScore is 0 due to Tier 1, you MUST still include nutrition-based positives and negatives.

POSITIVE/NEGATIVE ITEM RULES — NUTRITION FIRST:
1. ALWAYS include nutrition-based items when nutrition data is available.
   Restriction/diet mismatches must NOT replace or suppress nutrition insights.
   A correct output for a non-halal product scanned by a halal user looks like:
   positives: [protein, fiber, low sugar], negatives: [high salt, high calories, not halal]

2. NUTRITION items (category: "nutrition") come FIRST.
   Include ALL of these core nutrients when the data is available (not just 2):
   sugar, salt, calories, fiber, protein, saturated-fat.
   Each available nutrient should appear in EITHER positives OR negatives based on thresholds below.

   Format:
   - key: "sugar", "salt", "calories", "fiber", "protein", "saturated-fat"
   - label: the nutrient name (e.g. "Sugar", "Protein")
   - description: short explanation referencing the person's profile (e.g. "Low sugar fits your preference")
   - value: the actual number from nutrition data (e.g. 3.5). Use null ONLY if the nutrition data is missing — never use 0 as a placeholder for missing data.
   - unit: "g", "kcal", or "mg"
   - per: "100g"
   - severity: based on thresholds below

   NUTRITION SEVERITY THRESHOLDS (per 100g):
   Calories: ≤150 kcal → good, 150-300 kcal → neutral, 300-500 kcal → warning, >500 kcal → bad
   Sugar: ≤5g → good, 5-10g → neutral, 10-15g → warning, >15g → bad
   Salt: ≤0.3g → good, 0.3-1g → neutral, 1-1.5g → warning, >1.5g → bad
   Saturated fat: ≤1.5g → good, 1.5-3g → neutral, 3-5g → warning, >5g → bad
   Protein: ≥8g → good, 5-8g → neutral, 2-5g → warning (in negatives only if user has HIGH_PROTEIN priority)
   Fiber: ≥3g → good, 1-3g → neutral, <1g → warning (in negatives only if user has HIGH_FIBER priority)

   Placement rule:
   - good → positives
   - neutral → skip (do not include)
   - warning/bad → negatives

3. RESTRICTION items (category: "restriction"):
   ONLY add restriction items when there IS a conflict or uncertainty (Tier 1 or Tier 2). Do NOT add "compatible" items.
   ONLY for restrictions EXPLICITLY listed in that profile's "Diet:" line.
   - key: "restriction-{type}" (e.g. "restriction-kosher")
   - label: the diet name (e.g. "Kosher", "Halal", "Vegan") — MUST NOT be empty
   - description: explain WHAT ingredient caused the conflict (e.g. "Contains pork which is not kosher", "Contains gelatin — verify kosher certification") — MUST NOT be empty
   - value: null, unit: null, per: null
   - Tier 2 (uncertain) → severity "warning", put in negatives
   - Tier 1 (conflict) → severity "bad", put in negatives
   - Tier 3 (compatible) → do NOT add any item

4. DIET items (category: "diet") for goal-related insights:
   - key: descriptive slug (e.g. "calorie-density", "weight-loss-fit")
   - value: null (or a number if relevant), unit: null or appropriate unit, per: null
   - severity: based on alignment with goal

5. INGREDIENTS items (category: "ingredients") for additive/ingredient concerns:
   - key: descriptive slug (e.g. "additives", "processing-level")
   - value: null or count, unit: null, per: null

ORDERING: nutrition items first, then restriction, then diet, then ingredients.
Max 5 positives and 5 negatives per profile.

VALUE RULES:
- value must be the ACTUAL number from the nutrition data
- If a nutrition field is missing from the product data, set value to null — NEVER use 0 as a substitute
- Real 0 values (e.g. sugar: 0g) are valid and must be returned as 0

SUGAR/SALT PROFILE-SPECIFIC OVERRIDE:
- If the person has LOW_SODIUM priority, lower salt thresholds: >0.5g → warning, >1g → bad
- If the person has LOW_SUGAR priority or DIABETES_CONTROL goal, lower sugar thresholds: >5g → warning, >10g → bad
- For people WITHOUT these priorities, use the standard thresholds above

SUMMARY:
- One sentence, max 20 words
- Specific to this person's profile

Analyze each profile INDEPENDENTLY based on their specific attributes.
Return results for ALL profiles listed in the prompt.`;

export const buildPrompt = (product: NormalizedProduct, profiles: ProfileInput[]): string => {
  const parts: string[] = [];

  parts.push(`=== PRODUCT ===`);
  if (product.product_name) parts.push(`Name: ${product.product_name}`);
  if (product.brands) parts.push(`Brand: ${product.brands}`);
  if (product.categories) parts.push(`Categories: ${product.categories}`);

  if (product.ingredients.length > 0) {
    parts.push(`Ingredients: ${product.ingredients.slice(0, 30).join(', ')}`);
  } else if (product.ingredients_text) {
    parts.push(`Ingredients: ${product.ingredients_text.slice(0, 500)}`);
  }

  if (product.allergens.length > 0) {
    parts.push(`Allergens: ${product.allergens.join(', ')}`);
  }
  if (product.traces.length > 0) {
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
