import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import type { NormalizedProduct, ProfileComparisonResult } from '@acme/shared';
import { AI_MODELS } from '../constants/models';
import type { ProfileInput } from './profileInputs';

const PROFILE_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const getProfileLabel = (index: number): string => PROFILE_LABELS[index] ?? `P${index}`;

// ── Inline comparison filters (ported from old restriction-filter) ───

const RESTRICTION_KEYWORDS: Record<string, string[]> = {
  VEGAN: ['vegan'], VEGETARIAN: ['vegetarian'], HALAL: ['halal'], KOSHER: ['kosher'],
  GLUTEN_FREE: ['gluten-free', 'gluten free', 'celiac'], DAIRY_FREE: ['dairy-free', 'dairy free'],
  KETO: ['keto'], PALEO: ['paleo'], NUT_FREE: ['nut-free', 'nut free'],
};

const filterComparisonPositives = (positives: string[], userRestrictions: string[]): string[] => {
  const set = new Set(userRestrictions);
  return positives.filter((text) => {
    const lower = text.toLowerCase();
    for (const [restriction, keywords] of Object.entries(RESTRICTION_KEYWORDS)) {
      if (set.has(restriction)) continue;
      if (keywords.some((kw) => lower.includes(kw))) return false;
    }
    return true;
  });
};

const filterComparisonNegatives = (negatives: string[], _userAllergies: string[]): string[] => {
  // Pass-through — no false-positive filtering needed for comparison bullets
  return negatives;
};

const comparisonItemSchema = z.object({
  positives: z.array(z.string()).describe('Short bullet points of advantages for this product for the profile'),
  negatives: z.array(z.string()).describe('Short bullet points of disadvantages for this product for the profile'),
});

const profileComparisonOutputSchema = z.object({
  profileLabel: z.string().describe('The exact profile label from the prompt (e.g. "A", "B")'),
  product1: comparisonItemSchema,
  product2: comparisonItemSchema,
  winner: z.enum(['product1', 'product2', 'tie']).describe('Which product is better for this profile'),
  conclusion: z.string().describe('One sentence explaining which product is better and why, max 25 words'),
});

const comparisonOutputSchema = z.object({
  profiles: z.array(profileComparisonOutputSchema),
});

const COMPARISON_SYSTEM_PROMPT = `You compare two food products for user profiles. Return structured JSON only.

═══ DIETARY RESTRICTIONS ═══

FACTS ONLY — NO SPECULATION:
Use ONLY the ingredients and nutrition data provided. Never speculate about sourcing, processing, hidden substances, or how an ingredient is manufactured.
If something is not explicitly listed in the ingredients, it is NOT present.

ONLY check restrictions listed in the profile's "Diet:" line. No Diet line → skip entirely.
Flag ONLY if an ingredient name EXPLICITLY matches a BANNED item. Do not speculate about what an ingredient "might contain" or "is sometimes made from".

BANNED = confirmed violation (Tier 1).
If no BANNED ingredient appears in the product → the product is compatible. Compatible = NO output.

HALAL — BANNED: pork, bacon, ham, lard, prosciutto, pancetta, alcohol, wine, beer, spirits.
KOSHER — BANNED: pork, bacon, ham, lard, shellfish, shrimp, crab, lobster, squid, octopus.
VEGAN — BANNED: meat, fish, shellfish, dairy, milk, cream, butter, cheese, whey, casein, eggs, honey, gelatin, lard.
VEGETARIAN — BANNED: meat, fish, shellfish, gelatin, lard, collagen, carmine.
GLUTEN_FREE — BANNED: wheat, barley, rye, spelt, semolina, bulgur, malt, seitan, farro, durum.
DAIRY_FREE — BANNED: milk, cream, butter, ghee, cheese, yogurt, kefir, whey, casein, lactose.
NUT_FREE — BANNED: peanut, almond, walnut, cashew, hazelnut, pistachio, macadamia, pecan, brazil nut, pine nut.
KETO — BANNED: bread, pasta, rice, cereals, potatoes, corn, legumes, sugar, syrup, candy, juice, soda.
PALEO — BANNED: grains, legumes, dairy, refined sugar, processed vegetable oils.

═══ ALLERGENS ═══

Only flag allergens listed in the profile's "Allergies:" line.
No allergies listed → ignore allergen data entirely. Do NOT mention traces.

═══ COMPARISON RULES ═══

For each product, produce 2-4 positives and 0-4 negatives. All bullets must be COMPARATIVE (relative to the other product).
- Max 12 words per bullet. Include actual values where available (e.g. "Lower sugar: 3g vs 12g").
- NEVER give the same nutritional positive to both products.
- A Tier 1 violation → negative. The other product gets a positive ONLY if user has that restriction.
- Only mention dietary compatibility as a positive if the OTHER product violates it.

Winner: Tier 1 violation in one product → other wins. Otherwise → better nutrition/ingredients. Tier 2 alone doesn't decide. Truly equal → "tie".
Conclusion: one sentence, max 25 words.

Analyze each profile INDEPENDENTLY.`;

const formatProductBlock = (product: NormalizedProduct, label: string, includeAllergens: boolean): string => {
  const parts: string[] = [];
  parts.push(`=== PRODUCT ${label} ===`);
  if (product.product_name) parts.push(`Name: ${product.product_name}`);
  if (product.brands) parts.push(`Brand: ${product.brands}`);
  if (product.categories) parts.push(`Categories: ${product.categories}`);

  if (product.ingredients.length > 0) {
    parts.push(`Ingredients: ${product.ingredients.slice(0, 30).join(', ')}`);
  } else if (product.ingredients_text) {
    parts.push(`Ingredients: ${product.ingredients_text.slice(0, 500)}`);
  }

  if (includeAllergens && product.allergens.length > 0) {
    parts.push(`Allergens: ${product.allergens.join(', ')}`);
  }
  if (includeAllergens && product.traces.length > 0) {
    parts.push(`Traces: ${product.traces.join(', ')}`);
  }

  const n = product.nutrition;
  const facts: string[] = [];
  if (n.energy_kcal_100g !== null) facts.push(`calories:${n.energy_kcal_100g}kcal`);
  if (n.proteins_100g !== null) facts.push(`protein:${n.proteins_100g}g`);
  if (n.fat_100g !== null) facts.push(`fat:${n.fat_100g}g`);
  if (n.saturated_fat_100g !== null) facts.push(`saturated_fat:${n.saturated_fat_100g}g`);
  if (n.carbohydrates_100g !== null) facts.push(`carbs:${n.carbohydrates_100g}g`);
  if (n.sugars_100g !== null) facts.push(`sugar:${n.sugars_100g}g`);
  if (n.fiber_100g !== null) facts.push(`fiber:${n.fiber_100g}g`);
  if (n.salt_100g !== null) facts.push(`salt:${n.salt_100g}g`);
  if (facts.length > 0) parts.push(`Nutrition per 100g: ${facts.join(', ')}`);

  const s = product.scores;
  if (s.nutriscore_grade) parts.push(`Nutri-Score: ${s.nutriscore_grade.toUpperCase()}`);

  return parts.join('\n');
};

const RESTRICTION_LABELS: Record<string, string> = {
  VEGAN: 'VEGAN',
  VEGETARIAN: 'VEGETARIAN',
  HALAL: 'HALAL',
  KOSHER: 'KOSHER',
  GLUTEN_FREE: 'GLUTEN-FREE',
  DAIRY_FREE: 'DAIRY-FREE',
  KETO: 'KETO',
  PALEO: 'PALEO',
  NUT_FREE: 'NUT-FREE',
};

const ALLERGY_LABELS: Record<string, string> = {
  PEANUTS: 'peanuts',
  TREE_NUTS: 'tree nuts',
  GLUTEN: 'gluten',
  DAIRY: 'dairy',
  SOY: 'soy',
  EGGS: 'eggs',
  SHELLFISH: 'shellfish',
  SESAME: 'sesame',
};

const buildComparisonPrompt = (
  product1: NormalizedProduct,
  product2: NormalizedProduct,
  profiles: ProfileInput[],
): string => {
  const parts: string[] = [];

  const anyProfileHasAllergies = profiles.some(
    (p) => p.onboarding.allergies.length > 0 || !!p.onboarding.otherAllergiesText,
  );

  parts.push(formatProductBlock(product1, '1', anyProfileHasAllergies));
  parts.push('');
  parts.push(formatProductBlock(product2, '2', anyProfileHasAllergies));
  parts.push('');
  parts.push(`Compare these two products for EACH of the ${profiles.length} profiles below.`);
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

let cachedModel: ChatOpenAI | undefined;

const getModel = (): ChatOpenAI => {
  if (!cachedModel) {
    cachedModel = new ChatOpenAI({
      model: AI_MODELS.reason,
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 3,
      reasoning: {"effort": "medium"},
    });
  }
  return cachedModel;
};

export const compareProductsForProfiles = async (
  product1: NormalizedProduct,
  product2: NormalizedProduct,
  profiles: ProfileInput[],
): Promise<ProfileComparisonResult[]> => {
  if (!process.env.OPENAI_API_KEY || profiles.length === 0) {
    return [];
  }

  const p1Name = product1.product_name ?? product1.code ?? 'product1';
  const p2Name = product2.product_name ?? product2.code ?? 'product2';
  const profileNames = profiles.map((p, i) => `${getProfileLabel(i)}="${p.profileName}"`).join(', ');
  console.log(`\n[Compare] ▶ START  "${p1Name}" vs "${p2Name}"  profiles=[${profileNames}]`);
  const t0 = Date.now();

  const userMessage = buildComparisonPrompt(product1, product2, profiles);
  console.log(`[Compare] 📝 system prompt: ${COMPARISON_SYSTEM_PROMPT.length} chars, user message: ${userMessage.length} chars`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const structuredModel = (getModel() as any).withStructuredOutput(comparisonOutputSchema);

  const result = await structuredModel.invoke([
    { role: 'system', content: COMPARISON_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]);

  const parsed = comparisonOutputSchema.parse(result);
  console.log(`[Compare] ✅ AI responded  ${Date.now() - t0}ms  profiles=${parsed.profiles.length}`);

  return parsed.profiles.map((profileResult) => {
    const profileIndex = profiles.findIndex(
      (_, i) => getProfileLabel(i) === profileResult.profileLabel,
    );
    const profile = profiles[profileIndex] ?? profiles[0];
    console.log(`[Compare]   "${profile.profileName}" → winner=${profileResult.winner}  conclusion="${profileResult.conclusion}"`);

    const userRestrictions = profile.onboarding.restrictions;
    const userAllergies = profile.onboarding.allergies;

    return {
      profileId: profile.profileId,
      profileName: profile.profileName,
      product1: {
        positives: filterComparisonPositives(profileResult.product1.positives, userRestrictions),
        negatives: filterComparisonNegatives(profileResult.product1.negatives, userAllergies),
      },
      product2: {
        positives: filterComparisonPositives(profileResult.product2.positives, userRestrictions),
        negatives: filterComparisonNegatives(profileResult.product2.negatives, userAllergies),
      },
      winner: profileResult.winner,
      conclusion: profileResult.conclusion,
    };
  });
};
