import { z } from 'zod';
import { ingredientAnalysisResultSchema } from '@acme/shared';

export { ingredientAnalysisResultSchema };

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
