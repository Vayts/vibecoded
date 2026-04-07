import type { NormalizedProduct, IngredientAnalysis, OnboardingResponse } from '@acme/shared';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { AI_MODELS } from '../constants/models';

const ingredientItemSchema = z.object({
  name: z.string().describe('English-translated ingredient name, capitalized (e.g. "Sugar", "Palm Oil")'),
  status: z.enum(['good', 'neutral', 'warning', 'bad']).describe(
    'good = beneficial for this user, neutral = no concern, warning = mild concern, bad = conflicts with user restrictions/allergies',
  ),
  reason: z.string().nullable().describe(
    'Short reason (max 10 words) referencing the specific user restriction or allergy. null if neutral.',
  ),
});

const ingredientAnalysisOutputSchema = z.object({
  ingredients: z.array(ingredientItemSchema),
  summary: z.string().nullable().describe('One sentence summary of ingredient quality for this user. null if no notable concerns.'),
});

function buildProfileContext(onboarding: OnboardingResponse): string {
  const parts: string[] = [];

  if (onboarding.restrictions.length > 0) {
    parts.push(`Dietary restrictions: ${onboarding.restrictions.join(', ')}`);
  }
  if (onboarding.allergies.length > 0) {
    const allergies: string[] = onboarding.allergies
      .filter((a) => a !== 'OTHER')
      .map((a) => a);
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

const SYSTEM_PROMPT = `You are a food ingredient analyst. You receive a product's ingredient list and a user's dietary profile.

Your job:
1. Translate ALL ingredients to English
2. Classify each ingredient based on the user's specific restrictions, allergies, and priorities
3. Return structured JSON only

Classification rules:
- "bad" = directly conflicts with user's restrictions or allergies (e.g. pork for halal, milk for dairy-free, gluten for gluten-free)
- "warning" = potentially concerning but not certain (e.g. "natural flavors" when user has allergies — source is unclear)
- "good" = actively beneficial for user's goals/priorities (e.g. high-fiber ingredient when user prioritizes HIGH_FIBER)
- "neutral" = no specific concern or benefit for this user

Important:
- Every ingredient must appear in the output
- Translate names to English even if originally in English
- Keep names short and clear (e.g. "Palm Oil" not "Hydrogenated palm oil (contains soy lecithin)")
- Reason must reference the specific user attribute (restriction, allergy, goal)
- If no user restrictions/allergies, most ingredients will be "neutral"
- For common harmful additives (E-numbers known to be problematic), use "warning"
- Summary should mention only genuinely concerning ingredients for THIS user, or null if no concerns
- Custom allergy entries may contain nonsensical or overly broad text (e.g. "everything", "water", "all food", random words). Ignore any custom allergy that is not a real, specific food allergen or ingredient. Only flag ingredients that match a legitimate, medically recognized or plausible food allergy/sensitivity`;

export async function analyzeIngredients(
  product: NormalizedProduct,
  onboarding: OnboardingResponse,
): Promise<IngredientAnalysis | null> {
  const ingredientsText = buildIngredientsText(product);
  if (!ingredientsText) {
    return null;
  }

  const profileContext = buildProfileContext(onboarding);
  const productName = product.product_name ?? 'Unknown product';

  const userPrompt = `Product: ${productName}
Brand: ${product.brands ?? 'Unknown'}

Ingredients: ${ingredientsText}

User profile:
${profileContext}`;

  console.log(`[IngredientAnalysis] Starting — ${product.ingredients?.length ?? 0} ingredients`);
  const start = Date.now();

  try {
    const model = new ChatOpenAI({
      modelName: AI_MODELS.reason,
      reasoning: {
        effort: 'low'
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const structured = model.withStructuredOutput(ingredientAnalysisOutputSchema as any);
    const raw = await structured.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);
    const result = raw as IngredientAnalysis;

    console.log(`[IngredientAnalysis] Done — ${result.ingredients.length} items  ${Date.now() - start}ms`);
    return result;
  } catch (err) {
    console.error(`[IngredientAnalysis] Failed:`, err);
    return null;
  }
}
