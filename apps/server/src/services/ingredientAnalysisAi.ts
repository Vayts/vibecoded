import { ChatOpenAI } from '@langchain/openai';
import type {
  BarcodeLookupProduct,
  IngredientAnalysisResult,
  OnboardingResponse,
} from '@acme/shared';
import { DEFAULT_ONBOARDING_RESPONSE } from '@acme/shared';

import { AI_MODELS } from './prompts';
import { ingredientAnalysisResultSchema } from './ingredientAnalysisSchema';
import {
  INGREDIENT_ANALYSIS_SYSTEM_PROMPT,
  buildIngredientAnalysisPrompt,
} from './ingredientAnalysisPrompts';
import { extractIngredients } from './ingredientExtraction';

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
}

let cachedService: IngredientAnalysisAiService | undefined;

export const getIngredientAnalysisService = (): IngredientAnalysisAiService => {
  if (!cachedService) {
    cachedService = new IngredientAnalysisAiService();
  }
  return cachedService;
};
