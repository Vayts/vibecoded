import { z } from 'zod';

// ============================================================
// Product Type Taxonomy
// ============================================================

export const PRODUCT_TYPE_VALUES = [
  'beverage',
  'dairy',
  'yogurt',
  'cheese',
  'meat',
  'fish',
  'snack',
  'sweet',
  'cereal',
  'sauce',
  'bread',
  'ready_meal',
  'plant_protein',
  'dessert',
  'fruit_vegetable',
  'other',
] as const;

export const productTypeSchema = z.enum(PRODUCT_TYPE_VALUES);
export type ProductType = z.infer<typeof productTypeSchema>;

// ============================================================
// Diet Compatibility
// ============================================================

export const dietCompatibilityValueSchema = z.enum(['compatible', 'incompatible', 'unclear']);
export type DietCompatibilityValue = z.infer<typeof dietCompatibilityValueSchema>;

export const dietCompatibilitySchema = z.object({
  vegan: dietCompatibilityValueSchema,
  vegetarian: dietCompatibilityValueSchema,
  halal: dietCompatibilityValueSchema,
  kosher: dietCompatibilityValueSchema,
  glutenFree: dietCompatibilityValueSchema,
  dairyFree: dietCompatibilityValueSchema,
  nutFree: dietCompatibilityValueSchema,
});
export type DietCompatibility = z.infer<typeof dietCompatibilitySchema>;

export const DIET_KEYS = [
  'vegan', 'vegetarian', 'halal', 'kosher', 'glutenFree', 'dairyFree', 'nutFree',
] as const;
export type DietKey = (typeof DIET_KEYS)[number];

export const dietCompatibilityReasonsSchema = z.object({
  vegan: z.string().nullable().optional(),
  vegetarian: z.string().nullable().optional(),
  halal: z.string().nullable().optional(),
  kosher: z.string().nullable().optional(),
  glutenFree: z.string().nullable().optional(),
  dairyFree: z.string().nullable().optional(),
  nutFree: z.string().nullable().optional(),
});
export type DietCompatibilityReasons = z.infer<typeof dietCompatibilityReasonsSchema>;

// ============================================================
// Nutrition Facts (structured)
// ============================================================

export const nutritionFactsSchema = z.object({
  calories: z.number().nullable(),
  protein: z.number().nullable(),
  fat: z.number().nullable(),
  saturatedFat: z.number().nullable(),
  carbs: z.number().nullable(),
  sugars: z.number().nullable(),
  fiber: z.number().nullable(),
  salt: z.number().nullable(),
  sodium: z.number().nullable(),
});
export type NutritionFacts = z.infer<typeof nutritionFactsSchema>;

// ============================================================
// Nutrition Summary (levels)
// ============================================================

export const nutritionLevelSchema = z.enum(['low', 'moderate', 'high', 'unknown']);
export type NutritionLevel = z.infer<typeof nutritionLevelSchema>;

export const nutritionSummarySchema = z.object({
  sugarLevel: nutritionLevelSchema,
  saltLevel: nutritionLevelSchema,
  calorieLevel: nutritionLevelSchema,
  proteinLevel: nutritionLevelSchema,
  fiberLevel: nutritionLevelSchema,
  saturatedFatLevel: nutritionLevelSchema,
});
export type NutritionSummary = z.infer<typeof nutritionSummarySchema>;

// ============================================================
// Nutri Grade
// ============================================================

export const nutriGradeSchema = z.enum(['a', 'b', 'c', 'd', 'e']).nullable();
export type NutriGrade = z.infer<typeof nutriGradeSchema>;

// ============================================================
// Product Facts (AI output)
// ============================================================

export const productFactsSchema = z.object({
  productType: productTypeSchema.nullable(),
  dietCompatibility: dietCompatibilitySchema,
  dietCompatibilityReasons: dietCompatibilityReasonsSchema.optional(),
  nutritionFacts: nutritionFactsSchema,
  nutritionSummary: nutritionSummarySchema,
  nutriGrade: nutriGradeSchema,
});
export type ProductFacts = z.infer<typeof productFactsSchema>;

// ============================================================
// Score Reason (deterministic engine output)
// ============================================================

export const scoreReasonKindSchema = z.enum(['positive', 'negative', 'neutral']);
export type ScoreReasonKind = z.infer<typeof scoreReasonKindSchema>;

export const scoreReasonSourceSchema = z.enum([
  'nutrition',
  'diet',
  'goal',
  'restriction',
  'product_type',
  'allergen',
]);
export type ScoreReasonSource = z.infer<typeof scoreReasonSourceSchema>;

export const scoreReasonSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  value: z.number().nullable(),
  unit: z.string().nullable(),
  impact: z.number(),
  kind: scoreReasonKindSchema,
  source: scoreReasonSourceSchema,
});
export type ScoreReason = z.infer<typeof scoreReasonSchema>;

// ============================================================
// Profile Product Score (per-profile result)
// ============================================================

export const fitLabelSchema = z.enum(['great_fit', 'good_fit', 'neutral', 'poor_fit']);
export type FitLabel = z.infer<typeof fitLabelSchema>;

export const profileTypeSchema = z.enum(['self', 'family_member']);
export type ProfileType = z.infer<typeof profileTypeSchema>;

export const profileProductScoreSchema = z.object({
  profileId: z.string(),
  profileType: profileTypeSchema,
  name: z.string(),
  score: z.number().min(0).max(100),
  fitLabel: fitLabelSchema,
  positives: z.array(scoreReasonSchema),
  negatives: z.array(scoreReasonSchema),
});
export type ProfileProductScore = z.infer<typeof profileProductScoreSchema>;

// ============================================================
// Product Analysis Result (final output)
// ============================================================

export const productAnalysisResultSchema = z.object({
  productFacts: productFactsSchema,
  profiles: z.array(profileProductScoreSchema),
});
export type ProductAnalysisResult = z.infer<typeof productAnalysisResultSchema>;

// ============================================================
// Analysis Job (async polling)
// ============================================================

export const analysisJobStatusSchema = z.enum(['pending', 'completed', 'failed']);
export type AnalysisJobStatus = z.infer<typeof analysisJobStatusSchema>;

export const analysisJobResponseSchema = z.object({
  jobId: z.string(),
  status: analysisJobStatusSchema,
  result: productAnalysisResultSchema.optional(),
});
export type AnalysisJobResponse = z.infer<typeof analysisJobResponseSchema>;
