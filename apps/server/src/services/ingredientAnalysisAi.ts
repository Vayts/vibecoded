import { ChatOpenAI } from '@langchain/openai';
import type {
  BarcodeLookupProduct,
  IngredientAnalysisResult,
  OnboardingResponse,
} from '@acme/shared';
import { DEFAULT_ONBOARDING_RESPONSE } from '@acme/shared';

import { AI_MODELS } from '../domain/flashcards/prompts';
import {
  ingredientAnalysisResultSchema,
  multiProfileIngredientResultSchema,
} from '../domain/ingredient-analysis/schema';
import {
  INGREDIENT_ANALYSIS_SYSTEM_PROMPT,
  MULTI_PROFILE_INGREDIENT_ANALYSIS_SYSTEM_PROMPT,
  buildIngredientAnalysisPrompt,
  buildMultiProfileIngredientAnalysisPrompt,
  type ProfileForPrompt,
} from '../domain/ingredient-analysis/prompts';
import { extractIngredients } from '../domain/ingredient-analysis/extraction';

const MAX_INGREDIENTS = 30;

export class IngredientAnalysisAiService {
  private readonly model: ChatOpenAI;

  constructor(model?: ChatOpenAI) {
    this.model =
      model ??
      new ChatOpenAI({
        model: AI_MODELS.mini,
        temperature: 0,
        apiKey: process.env.OPENAI_API_KEY,
      });
  }

  async analyzeProduct(
    product: BarcodeLookupProduct,
    onboarding: OnboardingResponse = DEFAULT_ONBOARDING_RESPONSE,
  ): Promise<IngredientAnalysisResult | null> {
    if (!process.env.OPENAI_API_KEY) {
      return null;
    }

    const rawIngredients = extractIngredients(product);
    if (!rawIngredients || rawIngredients.length === 0) {
      return null;
    }

    const ingredients = rawIngredients.slice(0, MAX_INGREDIENTS);

    const userProfile = {
      restrictions: onboarding.restrictions,
      allergies: onboarding.allergies,
      nutritionPriorities: onboarding.nutritionPriorities,
      mainGoal: onboarding.mainGoal,
    };

    try {
      const userMessage = buildIngredientAnalysisPrompt(product, ingredients, userProfile);
      console.log('[IngredientAnalysis] Prompt:\n', userMessage);

      // LangChain typing for withStructuredOutput remains too deep for strict TS here.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const structuredModel = (this.model as any).withStructuredOutput(
        ingredientAnalysisResultSchema,
      );

      const result = (await structuredModel.invoke([
        { role: 'system', content: INGREDIENT_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ])) as IngredientAnalysisResult;

      console.log('[IngredientAnalysis] Result:', JSON.stringify(result, null, 2));

      const parsed = ingredientAnalysisResultSchema.parse(result);
      return parsed.ingredients.length > 0 ? parsed : null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Ingredient analysis AI failed: ${message}`);
      return null;
    }
  }

  /**
   * Analyze ingredients for multiple profiles in a SINGLE AI request.
   * Returns a Map from profile label → IngredientAnalysisResult.
   */
  async analyzeProductMultiProfile(
    product: BarcodeLookupProduct,
    profiles: ProfileForPrompt[],
  ): Promise<Map<string, IngredientAnalysisResult>> {
    const resultMap = new Map<string, IngredientAnalysisResult>();

    if (!process.env.OPENAI_API_KEY || profiles.length === 0) {
      return resultMap;
    }

    const rawIngredients = extractIngredients(product);
    if (!rawIngredients || rawIngredients.length === 0) {
      return resultMap;
    }

    const ingredients = rawIngredients.slice(0, MAX_INGREDIENTS);

    try {
      const userMessage = buildMultiProfileIngredientAnalysisPrompt(product, ingredients, profiles);
      console.log('[IngredientAnalysis] Multi-profile prompt:\n', userMessage);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const structuredModel = (this.model as any).withStructuredOutput(
        multiProfileIngredientResultSchema,
      );

      const result = await structuredModel.invoke([
        { role: 'system', content: MULTI_PROFILE_INGREDIENT_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ]);

      const parsed = multiProfileIngredientResultSchema.parse(result);

      for (const entry of parsed.profiles) {
        const profileResult: IngredientAnalysisResult = {
          ingredients: entry.ingredients,
          summary: entry.summary,
        };
        const validated = ingredientAnalysisResultSchema.safeParse(profileResult);
        if (validated.success && validated.data.ingredients.length > 0) {
          resultMap.set(entry.profileLabel, validated.data);
        }
      }

      console.log(
        `[IngredientAnalysis] Multi-profile result: ${resultMap.size}/${profiles.length} profiles`,
      );
      return resultMap;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Multi-profile ingredient analysis AI failed: ${message}`);
      return resultMap;
    }
  }
}

let cachedService: IngredientAnalysisAiService | undefined;

export const getIngredientAnalysisService = (): IngredientAnalysisAiService => {
  if (!cachedService) {
    cachedService = new IngredientAnalysisAiService();
  }
  return cachedService;
};
