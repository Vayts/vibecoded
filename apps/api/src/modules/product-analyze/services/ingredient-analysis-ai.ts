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
1. Translate ALL ingredients to English
2. For each provided profileId, classify each ingredient based on that profile's specific restrictions, allergies, and priorities
3. Return structured JSON only

Classification rules:
- "bad" = directly conflicts with user's restrictions or allergies (e.g. pork for halal, milk for dairy-free, gluten for gluten-free)
- "warning" = potentially concerning but not certain (e.g. "natural flavors" when user has allergies — source is unclear)
- "good" = actively beneficial for user's goals/priorities (e.g. high-fiber ingredient when user prioritizes HIGH_FIBER)
- "neutral" = no specific concern or benefit for this user

Important:
- Return exactly one analysis block for every provided profileId
- Use the exact profileId values from the input
- Every ingredient must appear in the output
- Every ingredient must appear in every profile output
- Translate names to English even if originally in English
- Keep names short and clear (e.g. "Palm Oil" not "Hydrogenated palm oil (contains soy lecithin)")
- Reason must reference the specific user attribute (restriction, allergy, goal)
- If no user restrictions/allergies, most ingredients will be "neutral"
- For common harmful additives (E-numbers known to be problematic), use "warning"
- Summary should mention only genuinely concerning ingredients for THIS user, or null if no concerns
- Custom allergy entries may contain nonsensical or overly broad text (e.g. "everything", "water", "all food", random words). Ignore any custom allergy that is not a real, specific food allergen or ingredient. Only flag ingredients that match a legitimate, medically recognized or plausible food allergy/sensitivity`;

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
