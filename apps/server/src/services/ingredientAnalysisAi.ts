import { ChatOpenAI } from '@langchain/openai';
import type { BarcodeLookupProduct, IngredientAnalysisResult, IngredientAnalysisItem } from '@acme/shared';

import { AI_MODELS } from '../domain/flashcards/prompts';
import {
  ingredientAnalysisResultSchema,
  compactMultiProfileResultSchema,
} from '../domain/ingredient-analysis/schema';
import {
  MULTI_PROFILE_INGREDIENT_ANALYSIS_SYSTEM_PROMPT,
  buildMultiProfileIngredientAnalysisPrompt,
  type ProfileForPrompt,
} from '../domain/ingredient-analysis/prompts';
import { extractIngredients } from '../domain/ingredient-analysis/extraction';
import { isFalseDietViolation } from '../domain/personal-analysis/restriction-filter';

const MAX_INGREDIENTS = 30;

export class IngredientAnalysisAiService {
  private readonly model: ChatOpenAI;

  constructor(model?: ChatOpenAI) {
    this.model =
      model ??
      new ChatOpenAI({
        model: AI_MODELS.reason,
        temperature: 0,
        apiKey: process.env.OPENAI_API_KEY,
        maxRetries: 3,
      });
  }

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
        compactMultiProfileResultSchema,
      );

      const result = await structuredModel.invoke([
        { role: 'system', content: MULTI_PROFILE_INGREDIENT_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ]);

      const parsed = compactMultiProfileResultSchema.parse(result);

      for (const entry of parsed.profiles) {
        // Start with all ingredients as neutral
        const fullIngredients: IngredientAnalysisItem[] = ingredients.map((ing) => ({
          original: ing.original,
          normalized: ing.original,
          label: ing.original,
          status: 'neutral' as const,
          reason: 'No conflict with profile',
          matchesUserPreference: null,
        }));

        // Override flagged (non-neutral) ingredients, filtering false diet violations
        for (const flagged of entry.flagged) {
          if (flagged.i >= 0 && flagged.i < fullIngredients.length) {
            // Skip if reason mentions a diet but no definitely-banned ingredient
            if (flagged.s === 'bad' && isFalseDietViolation(flagged.r)) {
              console.log(`[IngredientAnalysis] ❌ Filtered false diet violation: [${flagged.i}] "${fullIngredients[flagged.i].original}" reason="${flagged.r}"`);
              continue;
            }
            fullIngredients[flagged.i].status = flagged.s;
            fullIngredients[flagged.i].reason = flagged.r;
            fullIngredients[flagged.i].matchesUserPreference = flagged.s === 'good' ? true : false;
          }
        }

        const profileResult: IngredientAnalysisResult = {
          ingredients: fullIngredients,
          summary: entry.summary,
        };
        const validated = ingredientAnalysisResultSchema.safeParse(profileResult);
        if (validated.success && validated.data.ingredients.length > 0) {
          resultMap.set(entry.p, validated.data);
        }
      }

      console.log(
        `[IngredientAnalysis] Multi-profile result: ${resultMap.size}/${profiles.length} profiles`,
      );
      return resultMap;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      const extra = error instanceof Error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error);
      console.error(`Multi-profile ingredient analysis AI failed: ${message}\nStack: ${stack}\nDetails: ${extra}`);
      throw error;
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
