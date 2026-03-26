import { z } from 'zod';

// ============================================================
// Scanner schemas
// ============================================================

export const barcodeLookupRequestSchema = z.object({
  barcode: z
    .string()
    .trim()
    .min(1, 'Barcode is required')
    .regex(/^\d{8,32}$/, 'Barcode must contain 8 to 32 digits'),
});
export type BarcodeLookupRequest = z.infer<typeof barcodeLookupRequestSchema>;

export const scannerLookupSourceSchema = z.enum(['openfoodfacts', 'photo']);
export type ScannerLookupSource = z.infer<typeof scannerLookupSourceSchema>;

export const barcodeLookupProductSchema = z.object({
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
  images: z.object({
    front_url: z.string().nullable(),
    ingredients_url: z.string().nullable(),
    nutrition_url: z.string().nullable(),
  }),
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
export type BarcodeLookupProduct = z.infer<typeof barcodeLookupProductSchema>;
export const normalizedProductSchema = barcodeLookupProductSchema;
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

export const productAnalysisItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  value: z.number().nullable(),
  unit: z.string().nullable(),
  severity: z.enum(['good', 'neutral', 'warning', 'bad']),
  overview: z.string(),
});
export type ProductAnalysisItem = z.infer<typeof productAnalysisItemSchema>;

export const positiveProductAnalysisItemSchema = productAnalysisItemSchema.extend({
  severity: z.enum(['good', 'neutral']),
});
export type PositiveProductAnalysisItem = z.infer<typeof positiveProductAnalysisItemSchema>;

export const negativeProductAnalysisItemSchema = productAnalysisItemSchema.extend({
  severity: z.enum(['warning', 'bad']),
});
export type NegativeProductAnalysisItem = z.infer<typeof negativeProductAnalysisItemSchema>;

export const productAnalysisResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  rating: z.enum(['excellent', 'good', 'average', 'bad']),
  summary: z.string(),
  positives: z.array(positiveProductAnalysisItemSchema),
  negatives: z.array(negativeProductAnalysisItemSchema),
  warnings: z.array(z.string()),
});
export type ProductAnalysisResult = z.infer<typeof productAnalysisResultSchema>;

export const personalFitLabelSchema = z.enum(['great_fit', 'good_fit', 'neutral', 'poor_fit']);
export type PersonalFitLabel = z.infer<typeof personalFitLabelSchema>;

export const personalAnalysisResultSchema = z.object({
  fitScore: z.number().min(0).max(100),
  fitLabel: personalFitLabelSchema,
  summary: z.string().optional(),
  positives: z.array(positiveProductAnalysisItemSchema),
  negatives: z.array(negativeProductAnalysisItemSchema),
});
export type PersonalAnalysisResult = z.infer<typeof personalAnalysisResultSchema>;

export const personalAnalysisJobStatusSchema = z.enum(['pending', 'completed', 'failed']);
export type PersonalAnalysisJobStatus = z.infer<typeof personalAnalysisJobStatusSchema>;

export const personalAnalysisJobSchema = z.object({
  jobId: z.string(),
  status: personalAnalysisJobStatusSchema,
});
export type PersonalAnalysisJob = z.infer<typeof personalAnalysisJobSchema>;

export const personalAnalysisJobResponseSchema = z.object({
  jobId: z.string(),
  status: personalAnalysisJobStatusSchema,
  result: personalAnalysisResultSchema.optional(),
});
export type PersonalAnalysisJobResponse = z.infer<typeof personalAnalysisJobResponseSchema>;

export const barcodeLookupSuccessResponseSchema = z.object({
  success: z.literal(true),
  barcode: z.string(),
  source: scannerLookupSourceSchema,
  product: barcodeLookupProductSchema,
  evaluation: productAnalysisResultSchema,
  personalAnalysis: personalAnalysisJobSchema,
});
export type BarcodeLookupSuccessResponse = z.infer<typeof barcodeLookupSuccessResponseSchema>;

export const barcodeLookupNotFoundResponseSchema = z.object({
  success: z.literal(false),
  barcode: z.string(),
  source: scannerLookupSourceSchema,
  error: z.literal('PRODUCT_NOT_FOUND'),
});
export type BarcodeLookupNotFoundResponse = z.infer<typeof barcodeLookupNotFoundResponseSchema>;

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

// ============================================================
// Scan history schemas
// ============================================================

export const scanSourceSchema = z.enum(['barcode', 'photo']);
export type ScanSource = z.infer<typeof scanSourceSchema>;

export const scanHistoryItemSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  source: scanSourceSchema,
  overallScore: z.number().nullable(),
  overallRating: z.string().nullable(),
  personalScore: z.number().nullable(),
  personalRating: personalFitLabelSchema.nullable(),
  personalAnalysisStatus: personalAnalysisJobStatusSchema.nullable(),
  product: z
    .object({
      id: z.string(),
      barcode: z.string(),
      product_name: z.string().nullable(),
      brands: z.string().nullable(),
      image_url: z.string().nullable(),
    })
    .nullable(),
});
export type ScanHistoryItem = z.infer<typeof scanHistoryItemSchema>;

export const scanHistoryResponseSchema = z.object({
  items: z.array(scanHistoryItemSchema),
  nextCursor: z.string().nullable(),
});
export type ScanHistoryResponse = z.infer<typeof scanHistoryResponseSchema>;

export const scanDetailResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  source: scanSourceSchema,
  overallScore: z.number().nullable(),
  overallRating: z.string().nullable(),
  personalAnalysisStatus: personalAnalysisJobStatusSchema.nullable(),
  barcode: z.string().nullable(),
  product: barcodeLookupProductSchema.nullable(),
  evaluation: productAnalysisResultSchema.nullable(),
  personalResult: personalAnalysisResultSchema.nullable(),
});
export type ScanDetailResponse = z.infer<typeof scanDetailResponseSchema>;

// ============================================================
// Error schema
// ============================================================

export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
