import { z } from 'zod';
import {
  productTypeSchema,
  dietCompatibilitySchema,
  dietCompatibilityReasonsSchema,
  ignoredNutritionFactSchema,
  nutriGradeSchema,
} from '@acme/shared';

/**
 * Schema for the AI structured output — classification facts only.
 * AI does NOT return nutritionFacts or nutritionSummary.
 * Those come from the product data (OFF/DB) or web search.
 */
export const productFactsAiOutputSchema = z.object({
  isFood: z.boolean().default(true).describe('Whether the scanned item is a food or drink product'),
  productType: productTypeSchema
    .nullable()
    .describe('Best-matching product category from the enum, or null if unclear'),
  dietCompatibility: dietCompatibilitySchema.describe(
    'Diet compatibility facts extracted from ingredients',
  ),
  dietCompatibilityReasons: dietCompatibilityReasonsSchema.describe(
    'Short reason for each incompatible or unclear diet. Null or omit for compatible diets.',
  ),
  ignoredNutritionFacts: z
    .array(ignoredNutritionFactSchema)
    .default([])
    .describe(
      'Nutrition dimensions that should be ignored for scoring because they are not meaningful for this specific product.',
    ),
  nutriGrade: nutriGradeSchema.describe('Nutri-Score grade if available, else null'),
});

export type AiClassification = z.infer<typeof productFactsAiOutputSchema>;
