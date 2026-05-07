import { z } from 'zod';
import {
  analysisErrorSchema,
  analysisJobStatusSchema,
  scoreReasonSchema,
} from './product-analysis';

export const scannerProfileTypeSchema = z.enum(['user', 'family_member']);
export type ScannerProfileType = z.infer<typeof scannerProfileTypeSchema>;

export const scannerSafetyStatusSchema = z.enum(['safe', 'caution', 'avoid']);
export type ScannerSafetyStatus = z.infer<typeof scannerSafetyStatusSchema>;

export const scannerOverallRatingSchema = z.enum([
  'excellent',
  'good_choice',
  'okay',
  'use_with_caution',
  'avoid',
]);
export type ScannerOverallRating = z.infer<typeof scannerOverallRatingSchema>;

export const scannerAllergenDetectionSchema = z.object({
  allergy: z.string(),
  detected: z.boolean(),
  source: z.enum(['off_allergen_tag', 'off_trace_tag', 'ingredient_text', 'ai_inference']),
  confidence: z.number().min(0).max(1),
  ingredients: z.array(z.string()),
  evidence: z.array(z.string()),
});
export type ScannerAllergenDetection = z.infer<typeof scannerAllergenDetectionSchema>;

export const scannerRestrictionDetectionSchema = z.object({
  restriction: z.string(),
  status: z.enum([
    'compatible',
    'semi_compatible',
    'not_compatible',
    'unclear',
    'requires_certification',
  ]),
  compatible: z.boolean().nullable().optional(),
  source: z.enum(['off_tag', 'ingredient_text', 'certification_tag', 'ai_inference']),
  confidence: z.number().min(0).max(1),
  ingredients: z.array(z.string()),
  evidence: z.array(z.string()),
});
export type ScannerRestrictionDetection = z.infer<typeof scannerRestrictionDetectionSchema>;

export const scannerTraceDetectionSchema = z.object({
  trace: z.string(),
  allergy: z.string().nullable().optional(),
  restriction: z.string().nullable().optional(),
  source: z.enum(['off_trace_tag', 'ingredient_text', 'ai_inference']),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
});
export type ScannerTraceDetection = z.infer<typeof scannerTraceDetectionSchema>;

export const scannerCanIHaveThisSchema = z.object({
  can: z.boolean(),
  reason: z.string(),
});
export type ScannerCanIHaveThis = z.infer<typeof scannerCanIHaveThisSchema>;
export const scannerCanIHaveThisAnswerSchema = scannerCanIHaveThisSchema;
export type ScannerCanIHaveThisAnswer = ScannerCanIHaveThis;

export const scannerProfileIngredientSchema = z.object({
  name: z.string().trim().min(1),
  compatible: z.boolean(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
});
export type ScannerProfileIngredient = z.infer<typeof scannerProfileIngredientSchema>;

export const scannerProfileAnalysisSchema = z.object({
  safety: z.object({
    score: z.number(),
    status: scannerSafetyStatusSchema,
    reasons: z.array(z.string()),
    matchedAllergens: z.array(z.string()),
    violatedRestrictions: z.array(z.string()),
    traceAllergens: z.array(z.string()).default([]),
    traceRestrictions: z.array(z.string()).default([]),
  }),
  goalFit: z.object({
    score: z.number(),
    goal: z.string().nullable(),
    role: z.string(),
    positives: z.array(z.string()),
    negatives: z.array(z.string()),
    details: z.record(z.string(), z.unknown()),
  }),
  nutrition: z.object({
    score: z.number(),
    positives: z.array(z.string()),
    negatives: z.array(z.string()),
    details: z.record(z.string(), z.unknown()),
  }),
  positives: z.array(scoreReasonSchema),
  negatives: z.array(scoreReasonSchema),
  overall: z.object({
    score: z.number(),
    rating: scannerOverallRatingSchema,
    summary: z.string(),
  }),
});
export type ScannerProfileAnalysis = z.infer<typeof scannerProfileAnalysisSchema>;

export const scannerProfileAiSchema = z.object({
  allergenDetections: z.array(scannerAllergenDetectionSchema),
  restrictionDetections: z.array(scannerRestrictionDetectionSchema),
  traceDetections: z.array(scannerTraceDetectionSchema).default([]),
  ingredients: z.array(scannerProfileIngredientSchema).default([]),
  canIHaveThis: scannerCanIHaveThisSchema,
});
export type ScannerProfileAi = z.infer<typeof scannerProfileAiSchema>;

export const scannerProfileResultSchema = z.object({
  profileId: z.string(),
  type: scannerProfileTypeSchema,
  displayName: z.string().nullable(),
  analysis: scannerProfileAnalysisSchema,
  ai: scannerProfileAiSchema,
});
export type ScannerProfileResult = z.infer<typeof scannerProfileResultSchema>;

export const scannerProductAnalysisResultSchema = z.object({
  product: z.object({
    name: z.string().nullable(),
    brand: z.string().nullable(),
    imageUrl: z.string().nullable(),
    ingredients: z.array(z.string()),
    allergens: z.array(z.string()),
    traces: z.array(z.string()),
    additives: z.array(z.string()),
    nutrition: z.object({
      caloriesPer100g: z.number().nullable(),
      caloriesPerServing: z.number().nullable(),
      proteinPer100g: z.number().nullable(),
      carbsPer100g: z.number().nullable(),
      sugarPer100g: z.number().nullable(),
      fatPer100g: z.number().nullable(),
      saturatedFatPer100g: z.number().nullable(),
      fiberPer100g: z.number().nullable(),
      sodiumPer100g: z.number().nullable(),
    }),
  }),
  profiles: z.array(scannerProfileResultSchema),
});
export type ScannerProductAnalysisResult = z.infer<typeof scannerProductAnalysisResultSchema>;

export const personalAnalysisJobSchema = z.object({
  analysisId: z.string(),
  status: analysisJobStatusSchema,
  productStatus: analysisJobStatusSchema,
  ingredientsStatus: analysisJobStatusSchema,
  result: scannerProductAnalysisResultSchema.optional(),
  error: analysisErrorSchema.optional(),
});
export type PersonalAnalysisJob = z.infer<typeof personalAnalysisJobSchema>;

export const personalAnalysisSocketEventPayloadSchema = personalAnalysisJobSchema.extend({
  scanId: z.string().optional(),
  productId: z.string().optional(),
  barcode: z.string().optional(),
});
export type PersonalAnalysisSocketEventPayload = z.infer<
  typeof personalAnalysisSocketEventPayloadSchema
>;
