import type { NormalizedProduct, IngredientAnalysis, OnboardingResponse } from '@acme/shared';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { AI_MODELS } from '../constants/models';

const SINGLE_PROFILE_ID = '__single_profile__';

export interface IngredientAnalysisProfileInput {
  profileId: string;
  onboarding: OnboardingResponse;
}

const ingredientItemSchema = z.object({
  name: z
    .string()
    .describe('English-translated ingredient name, capitalized (e.g. "Sugar", "Palm Oil")'),
  status: z
    .enum(['good', 'neutral', 'warning', 'bad'])
    .describe(
      'good = beneficial for this user, neutral = no concern, warning = mild concern, bad = conflicts with user restrictions/allergies',
    ),
  reason: z
    .string()
    .nullable()
    .describe(
      'Short reason (max 10 words) referencing the specific user restriction or allergy. null if neutral.',
    ),
  reasonType: z
    .enum(['DIET', 'ALLERGY'])
    .nullable()
    .describe(
      'DIET = ingredient conflicts with a dietary restriction (e.g. DAIRY_FREE, HALAL). ALLERGY = ingredient conflicts with a user-declared allergy. null if status is not bad.',
    ),
  dietConflicts: z
    .array(z.string())
    .describe(
      'When reasonType is DIET, list the exact restriction enum keys this ingredient violates from the profile, e.g. ["DAIRY_FREE", "VEGAN"]. Must be an empty array when reasonType is ALLERGY or null.',
    ),
});

const ingredientAnalysisOutputSchema = z.object({
  ingredients: z.array(ingredientItemSchema),
  summary: z
    .string()
    .nullable()
    .describe(
      'One sentence summary of ingredient quality for this user. null if no notable concerns.',
    ),
});

const profileIngredientAnalysisSchema = ingredientAnalysisOutputSchema.extend({
  profileId: z.string().describe('Exact profileId from the provided profile input.'),
});

const ingredientBatchAnalysisOutputSchema = z.object({
  profiles: z.array(profileIngredientAnalysisSchema),
});

type IngredientBatchAnalysisOutput = z.infer<typeof ingredientBatchAnalysisOutputSchema>;

interface StructuredIngredientAnalysisRunner {
  invoke(
    messages: Array<{ role: string; content: string }>,
  ): Promise<IngredientBatchAnalysisOutput>;
}

interface StructuredIngredientAnalysisModel {
  withStructuredOutput(
    schema: typeof ingredientBatchAnalysisOutputSchema,
  ): StructuredIngredientAnalysisRunner;
}

function buildProfileContext(onboarding: OnboardingResponse): string {
  const parts: string[] = [];

  if (onboarding.restrictions.length > 0) {
    parts.push(`Dietary restrictions: ${onboarding.restrictions.join(', ')}`);
  }
  if (onboarding.allergies.length > 0) {
    const allergies: string[] = onboarding.allergies.filter((a) => a !== 'OTHER').map((a) => a);
    if (onboarding.otherAllergiesText) {
      allergies.push(onboarding.otherAllergiesText);
    }
    if (allergies.length > 0) {
      parts.push(`Allergies: ${allergies.join(', ')}`);
    }
  }
  if (onboarding.nutritionPriorities.length > 0) {
    parts.push(`Nutrition priorities: ${onboarding.nutritionPriorities.join(', ')}`);
  }
  if (onboarding.mainGoal) {
    parts.push(`Goal: ${onboarding.mainGoal}`);
  }

  return parts.length > 0 ? parts.join('\n') : 'No specific dietary restrictions or preferences.';
}

function buildIngredientsText(product: NormalizedProduct): string | null {
  if (product.ingredients_text && product.ingredients_text.trim().length > 0) {
    return product.ingredients_text.trim();
  }
  if (product.ingredients && product.ingredients.length > 0) {
    return product.ingredients.join(', ');
  }
  return null;
}

function buildProfilesText(profiles: IngredientAnalysisProfileInput[]): string {
  return profiles
    .map((profile, index) => {
      const profileContext = buildProfileContext(profile.onboarding);

      return `Profile ${index + 1}:
Profile ID: ${profile.profileId}
${profileContext}`;
    })
    .join('\n\n');
}

const SYSTEM_PROMPT = `You are a food ingredient analyst. You receive a product's ingredient list and one or more user dietary profiles.

Your job:
1. Translate ALL ingredients to English.
2. For each provided profileId, classify each ingredient based on that profile's restrictions, allergies, and priorities.
3. Return structured JSON only.

CLASSIFICATION:
- "bad" = directly and explicitly conflicts with user's restriction or allergy.
- "warning" = potentially concerning, but not certain.
- "good" = actively beneficial for user's goals/priorities.
- "neutral" = no specific concern or benefit for this user.

GLOBAL CERTAINTY RULE:
- Use "bad" ONLY for explicit, known violations.
- Use "warning" for uncertainty, unclear source, missing certification, or ingredients that may require verification.
- Do NOT assume a violation without explicit evidence.
- Do NOT invent ingredient details.
- If unsure between "bad" and "warning", choose "warning".
- If unsure between "warning" and "neutral", choose "warning" only when the uncertainty is relevant to the user's profile.

DIET RULES:

VEGAN:
- bad: meat, fish, seafood, dairy, eggs, honey, gelatin, lard, collagen, carmine, animal fat, animal broth.
- warning: natural flavor, enzymes, mono- and diglycerides, glycerin, lecithin, vitamin D, unspecified flavoring if source unclear.

VEGETARIAN:
- bad: meat, fish, seafood, gelatin, lard, collagen, animal fat, animal broth, carmine.
- warning: rennet, enzymes, natural flavor, unspecified gelatin/source unclear.

GLUTEN_FREE:
- bad: wheat, barley, rye, spelt, semolina, durum wheat, malt, seitan, breadcrumbs, wheat flour.
- warning: starch, modified starch, flavoring, sauce, seasoning, oats if gluten-free status/source is unclear.

DAIRY_FREE:
- bad: milk, cream, butter, cheese, yogurt, whey, casein, lactose, milk powder.
- warning: natural flavor, flavoring, cream flavor, protein, enzymes if dairy source is unclear.

NUT_FREE:
- bad: peanut, almond, walnut, cashew, hazelnut, pistachio, pecan, macadamia, Brazil nut, pine nut, other tree nuts, nut paste, nut butter.
- warning: natural flavor, flavoring, praline, nougat, unspecified oil/paste if nut source is unclear.

HALAL:
- bad: pork, alcohol, lard, pork gelatin, pork derivatives, explicitly non-halal meat.
- warning: beef, chicken, veal, lamb, meat, meat broth, meat stock, gelatin, enzymes, natural flavor if halal status/source is unclear.
- Missing halal certification is NOT a direct violation.

KOSHER:
- bad: pork, shellfish, or explicit mixing of meat and dairy in the same product.
- warning: meat, meat broth, meat stock, dairy, cheese, gelatin, enzymes, natural flavor if kosher status/source is unclear.
- Meat alone is NOT a kosher violation.
- Dairy alone is NOT a kosher violation.
- Missing kosher certification is NOT a direct violation.

KETO:
- bad: sugar, glucose syrup, high-fructose corn syrup, wheat flour, rice, pasta, potato, corn starch, breadcrumbs, candy, sweetened ingredients when clearly high-carb.
- warning: starch, modified starch, maltodextrin, flour, sauce, sweetener, flavoring if carb impact is unclear.

PALEO:
- bad: wheat, grains, legumes, dairy, refined sugar, seed oils, highly processed additives.
- warning: natural flavor, modified starch, preservatives, emulsifiers, refined oils if processing/source is unclear.

reasonType and dietConflicts rules:
- reasonType = "DIET" only when status is "bad" because the ingredient explicitly violates a dietary restriction.
- reasonType = "ALLERGY" only when status is "bad" because the ingredient matches a declared allergy.
- reasonType = null for "good", "neutral", and "warning".
- dietConflicts must list dietary restriction enum keys ONLY when reasonType is "DIET".
- dietConflicts must be [] when reasonType is "ALLERGY" or null.
- Use exact enum keys only: VEGAN, VEGETARIAN, GLUTEN_FREE, DAIRY_FREE, HALAL, KOSHER, NUT_FREE, KETO, PALEO.

REASON RULES:
- Every ingredient must include a reason field.
- For "neutral", reason should be "".
- For "good", explain the benefit briefly.
- For "bad", name the explicit conflicting ingredient/restriction.
- For "warning", explain the uncertainty briefly.
- Never say "non-halal" or "non-kosher" unless the ingredient explicitly says so.
- Never say "not certified halal/kosher" as a reason for "bad"; use "warning" instead.

ALLERGY RULES:
- Custom allergy entries may contain invalid or nonsensical text such as "everything", "water", "all food", or random words.
- Ignore custom allergies that are not real, specific food allergens or plausible sensitivities.
- Only flag ingredients that match a legitimate food allergy/sensitivity.

INGREDIENT HANDLING:
- Translate ingredient names to English even if originally in English.
- Keep ingredient names short and clear.
- Preserve every ingredient from the input.
- Every ingredient must appear in every profile output.
- Do not merge unrelated ingredients.
- Do not add ingredients that are not present.

SUMMARY:
- Return exactly one analysis block for every provided profileId.
- Use exact profileId values from the input.
- Summary should mention only genuinely concerning ingredients for this user.
- Include "bad" ingredients and relevant "warning" ingredients.
- Return null if there are no concerns.

OUTPUT:
- Return structured JSON only.
- No prose.
- No markdown.
- No explanations outside JSON.`;


export async function analyzeIngredientsForProfiles(
  product: NormalizedProduct,
  profiles: IngredientAnalysisProfileInput[],
): Promise<Map<string, IngredientAnalysis | null>> {
  const ingredientsText = buildIngredientsText(product);
  const emptyResults = new Map(profiles.map((profile) => [profile.profileId, null] as const));

  if (profiles.length === 0 || !ingredientsText) {
    return emptyResults;
  }

  const productName = product.product_name ?? 'Unknown product';

  const userPrompt = `Product: ${productName}
Brand: ${product.brands ?? 'Unknown'}

Ingredients: ${ingredientsText}

Profiles:
${buildProfilesText(profiles)}`;

  console.log(
    `[IngredientAnalysis] Starting — ${profiles.length} profiles, ${product.ingredients?.length ?? 0} ingredients`,
  );
  const start = Date.now();

  try {
    const model = new ChatOpenAI({
      modelName: AI_MODELS.reason,
      reasoning: {
        effort: 'low',
      },
    });

    const structured = (model as unknown as StructuredIngredientAnalysisModel).withStructuredOutput(
      ingredientBatchAnalysisOutputSchema,
    );
    const raw = await structured.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);
    const result = ingredientBatchAnalysisOutputSchema.parse(raw);
    const resultsByProfileId = new Map(
      result.profiles.map((profileResult) => [
        profileResult.profileId,
        {
          ingredients: profileResult.ingredients,
          summary: profileResult.summary,
        } as IngredientAnalysis,
      ]),
    );

    console.log(
      `[IngredientAnalysis] Done — ${result.profiles.length} profiles  ${Date.now() - start}ms`,
    );

    return new Map(
      profiles.map((profile) => [
        profile.profileId,
        resultsByProfileId.get(profile.profileId) ?? null,
      ]),
    );
  } catch (err) {
    console.error(`[IngredientAnalysis] Failed:`, err);
    return emptyResults;
  }
}

export async function analyzeIngredients(
  product: NormalizedProduct,
  onboarding: OnboardingResponse,
): Promise<IngredientAnalysis | null> {
  const results = await analyzeIngredientsForProfiles(product, [
    { profileId: SINGLE_PROFILE_ID, onboarding },
  ]);

  return results.get(SINGLE_PROFILE_ID) ?? null;
}
