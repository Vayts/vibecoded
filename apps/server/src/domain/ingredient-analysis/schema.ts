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

/**
 * Compact AI-output schema — only non-neutral ingredients are returned.
 * Short keys to minimize output tokens. The runner maps this back to the full schema.
 */
const compactFlaggedItemSchema = z.object({
  i: z.number().describe('0-based ingredient index from the numbered input list'),
  s: z.enum(['bad', 'warning', 'good']).describe('Status (only non-neutral)'),
  r: z.string().describe('Reason referencing profile attribute. Max 12 words'),
});

export const compactMultiProfileResultSchema = z.object({
  profiles: z.array(
    z.object({
      p: z.string().describe('Profile label (A, B, ...)'),
      flagged: z.array(compactFlaggedItemSchema).describe('Only ingredients that are NOT neutral'),
      summary: z.string().nullable().describe('One sentence about overall compatibility'),
    }),
  ),
});
export type CompactMultiProfileResult = z.infer<typeof compactMultiProfileResultSchema>;
