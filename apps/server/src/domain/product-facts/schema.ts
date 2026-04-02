import { z } from 'zod';
import {
  productTypeSchema,
  dietCompatibilitySchema,
  dietCompatibilityReasonsSchema,
  nutritionFactsSchema,
  nutritionSummarySchema,
  nutriGradeSchema,
} from '@acme/shared';

/**
 * Schema for the AI structured output. Must match the ProductFacts shape exactly.
 * Used with LangChain's withStructuredOutput.
 */
export const productFactsAiOutputSchema = z.object({
  productType: productTypeSchema.nullable().describe('Best-matching product category from the enum, or null if unclear'),
  dietCompatibility: dietCompatibilitySchema.describe('Diet compatibility facts extracted from ingredients'),
  dietCompatibilityReasons: dietCompatibilityReasonsSchema.describe('Short reason for each incompatible or unclear diet. Null or omit for compatible diets.'),
  nutritionFacts: nutritionFactsSchema.describe('Structured nutrition values per 100g'),
  nutritionSummary: nutritionSummarySchema.describe('Qualitative nutrition levels'),
  nutriGrade: nutriGradeSchema.describe('Nutri-Score grade if available, else null'),
});
