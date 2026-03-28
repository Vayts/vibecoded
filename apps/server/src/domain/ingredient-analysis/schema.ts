import { z } from 'zod';
import { ingredientAnalysisResultSchema, ingredientAnalysisItemSchema } from '@acme/shared';

export { ingredientAnalysisResultSchema };

/**
 * Schema for AI structured output when analyzing ingredients for multiple profiles
 * in a single request. Each entry maps a profile label back to its result.
 */
export const multiProfileIngredientResultSchema = z.object({
  profiles: z.array(
    z.object({
      profileLabel: z.string().describe('The exact profile label from the prompt (e.g. "A", "B")'),
      ingredients: z.array(ingredientAnalysisItemSchema),
      summary: z.string().nullable().describe('One short sentence about overall compatibility for this profile'),
    }),
  ),
});
export type MultiProfileIngredientResult = z.infer<typeof multiProfileIngredientResultSchema>;
