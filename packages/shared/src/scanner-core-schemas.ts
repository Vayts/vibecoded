import { z } from 'zod';
import {
  analysisJobResponseSchema,
  analysisJobStatusSchema,
} from './product-analysis';
import { ingredientStatusSchema } from './product-analysis';

export const barcodeLookupRequestSchema = z.object({
  barcode: z
    .string()
    .trim()
    .min(1, 'Barcode is required')
    .regex(/^[\d]{8,32}$/, 'Barcode must contain 8 to 32 digits'),
});
export type BarcodeLookupRequest = z.infer<typeof barcodeLookupRequestSchema>;

export const scannerLookupSourceSchema = z.enum([
  'openfoodfacts',
  'websearch',
  'photo',
]);
export type ScannerLookupSource = z.infer<typeof scannerLookupSourceSchema>;

const productImagesSchema = z.object({
  front_url: z.string().nullable(),
  ingredients_url: z.string().nullable(),
  nutrition_url: z.string().nullable(),
});

const productCoreSchema = z.object({
  code: z.string(),
  product_name: z.string().nullable(),
  brands: z.string().nullable(),
  image_url: z.string().nullable(),
  ingredients_text: z.string().nullable(),
  nutriscore_grade: z.string().nullable(),
  categories: z.string().nullable(),
  quantity: z.string().nullable(),
  serving_size: z.string().nullable(),
  ingredients: z.array(z.string()),
  allergens: z.array(z.string()),
  additives: z.array(z.string()),
  additives_count: z.number().nullable(),
  traces: z.array(z.string()),
  countries: z.array(z.string()),
  category_tags: z.array(z.string()),
  nutrition: z.object({
    energy_kcal_100g: z.number().nullable(),
    proteins_100g: z.number().nullable(),
    fat_100g: z.number().nullable(),
    saturated_fat_100g: z.number().nullable(),
    carbohydrates_100g: z.number().nullable(),
    sugars_100g: z.number().nullable(),
    fiber_100g: z.number().nullable(),
    salt_100g: z.number().nullable(),
    sodium_100g: z.number().nullable(),
  }),
  scores: z.object({
    nutriscore_grade: z.string().nullable(),
    nutriscore_score: z.number().nullable(),
    ecoscore_grade: z.string().nullable(),
    ecoscore_score: z.number().nullable(),
  }),
});

export const barcodeLookupProductSchema = productCoreSchema;
export type BarcodeLookupProduct = z.infer<typeof barcodeLookupProductSchema>;

export const normalizedProductSchema = productCoreSchema.extend({
  images: productImagesSchema,
});
export type NormalizedProduct = z.infer<typeof normalizedProductSchema>;

export const evaluationItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  value: z.number().nullable(),
  unit: z.string().nullable(),
  severity: z.enum(['good', 'neutral', 'warning', 'bad']),
});
export type EvaluationItem = z.infer<typeof evaluationItemSchema>;

export const productEvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  rating: z.enum(['excellent', 'good', 'average', 'bad']),
  positives: z.array(evaluationItemSchema),
  negatives: z.array(evaluationItemSchema),
});
export type ProductEvaluation = z.infer<typeof productEvaluationSchema>;

export const ingredientAnalysisItemSchema = z.object({
  original: z.string().describe('Raw ingredient string from source'),
  normalized: z.string().describe(
    'Normalized/translated canonical English form',
  ),
  label: z.string().describe('UI-friendly display label'),
  status: ingredientStatusSchema.describe(
    'How frontend should highlight the ingredient',
  ),
  reason: z
    .string()
    .describe(
      'Why this status was assigned — must reference the specific profile attribute (restriction, allergy, priority, or goal). Max 12 words.',
    ),
  matchesUserPreference: z
    .boolean()
    .nullable()
    .describe('Whether it clearly matches/conflicts with profile'),
});
export type IngredientAnalysisItem = z.infer<typeof ingredientAnalysisItemSchema>;

export const ingredientAnalysisResultSchema = z.object({
  ingredients: z.array(ingredientAnalysisItemSchema),
  summary: z.string().nullable(),
});
export type IngredientAnalysisResult = z.infer<typeof ingredientAnalysisResultSchema>;

export const personalAnalysisJobStatusSchema = analysisJobStatusSchema;
export type PersonalAnalysisJobStatus = z.infer<
  typeof personalAnalysisJobStatusSchema
>;

export const personalAnalysisJobSchema = analysisJobResponseSchema;
export type PersonalAnalysisJob = z.infer<typeof personalAnalysisJobSchema>;

export const barcodeLookupSuccessResponseSchema = z.object({
  success: z.literal(true),
  barcode: z.string(),
  source: scannerLookupSourceSchema,
  product: barcodeLookupProductSchema,
  personalAnalysis: personalAnalysisJobSchema,
  scanId: z.string().optional(),
  productId: z.string().optional(),
  isFavourite: z.boolean().optional(),
});
export type BarcodeLookupSuccessResponse = z.infer<
  typeof barcodeLookupSuccessResponseSchema
>;

export const barcodeLookupNotFoundResponseSchema = z.object({
  success: z.literal(false),
  barcode: z.string(),
  source: scannerLookupSourceSchema,
  error: z.literal('PRODUCT_NOT_FOUND'),
});
export type BarcodeLookupNotFoundResponse = z.infer<
  typeof barcodeLookupNotFoundResponseSchema
>;

export const barcodeLookupResponseSchema = z.union([
  barcodeLookupSuccessResponseSchema,
  barcodeLookupNotFoundResponseSchema,
]);
export type BarcodeLookupResponse = z.infer<typeof barcodeLookupResponseSchema>;

export const chatHistoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});
export type ChatHistoryMessage = z.infer<typeof chatHistoryMessageSchema>;
