import { z } from 'zod';
import {
  mainGoalSchema,
  restrictionSchema,
  allergySchema,
  nutritionPrioritySchema,
} from './onboarding';

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

export const scannerLookupSourceSchema = z.enum(['openfoodfacts', 'websearch', 'photo']);
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
  per: z.enum(['100g']).nullable(),
  severity: z.enum(['good', 'neutral', 'warning', 'bad']),
  category: z.enum(['nutrition', 'diet', 'ingredients', 'restriction']),
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

// ============================================================
// Ingredient analysis schemas
// ============================================================

export const ingredientStatusSchema = z.enum(['good', 'neutral', 'warning', 'bad']);
export type IngredientStatus = z.infer<typeof ingredientStatusSchema>;

export const ingredientAnalysisItemSchema = z.object({
  original: z.string().describe('Raw ingredient string from source'),
  normalized: z.string().describe('Normalized/translated canonical English form'),
  label: z.string().describe('UI-friendly display label'),
  status: ingredientStatusSchema.describe('How frontend should highlight the ingredient'),
  reason: z.string().describe('Why this status was assigned — must reference the specific profile attribute (restriction, allergy, priority, or goal). Max 12 words.'),
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

export const personalAnalysisResultSchema = z.object({
  fitScore: z.number().min(0).max(100),
  fitLabel: personalFitLabelSchema,
  summary: z.string().optional(),
  positives: z.array(positiveProductAnalysisItemSchema),
  negatives: z.array(negativeProductAnalysisItemSchema),
  ingredientAnalysis: ingredientAnalysisResultSchema.nullable().optional(),
});
export type PersonalAnalysisResult = z.infer<typeof personalAnalysisResultSchema>;

export const personalAnalysisJobStatusSchema = z.enum(['pending', 'completed', 'failed']);
export type PersonalAnalysisJobStatus = z.infer<typeof personalAnalysisJobStatusSchema>;

export const personalAnalysisJobSchema = z.object({
  jobId: z.string(),
  status: personalAnalysisJobStatusSchema,
});
export type PersonalAnalysisJob = z.infer<typeof personalAnalysisJobSchema>;

export const ingredientAnalysisStatusSchema = z.enum(['pending', 'completed', 'skipped', 'failed']);
export type IngredientAnalysisStatus = z.infer<typeof ingredientAnalysisStatusSchema>;

export const personalAnalysisJobResponseSchema = z.object({
  jobId: z.string(),
  status: personalAnalysisJobStatusSchema,
  result: personalAnalysisResultSchema.optional(),
  ingredientAnalysisStatus: ingredientAnalysisStatusSchema.optional(),
});
export type PersonalAnalysisJobResponse = z.infer<typeof personalAnalysisJobResponseSchema>;

export const barcodeLookupSuccessResponseSchema = z.object({
  success: z.literal(true),
  barcode: z.string(),
  source: scannerLookupSourceSchema,
  product: barcodeLookupProductSchema,
  evaluation: productAnalysisResultSchema.optional(),
  personalAnalysis: personalAnalysisJobSchema,
  productId: z.string().optional(),
  isFavourite: z.boolean().optional(),
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
// Multi-profile personal analysis schemas
// ============================================================

export const profileFitChipSchema = z.object({
  profileId: z.string(),
  profileName: z.string(),
  fitScore: z.number().min(0).max(100),
  fitLabel: personalFitLabelSchema,
});
export type ProfileFitChip = z.infer<typeof profileFitChipSchema>;

export const profileAnalysisDetailSchema = personalAnalysisResultSchema;
export type ProfileAnalysisDetail = z.infer<typeof profileAnalysisDetailSchema>;

export const multiProfilePersonalAnalysisResultSchema = z.object({
  profiles: z.array(profileFitChipSchema),
  detailsByProfile: z.record(z.string(), personalAnalysisResultSchema),
});
export type MultiProfilePersonalAnalysisResult = z.infer<
  typeof multiProfilePersonalAnalysisResultSchema
>;

export const multiProfilePersonalAnalysisJobResponseSchema = z.object({
  jobId: z.string(),
  status: personalAnalysisJobStatusSchema,
  result: multiProfilePersonalAnalysisResultSchema.optional(),
  ingredientAnalysisStatus: ingredientAnalysisStatusSchema.optional(),
});
export type MultiProfilePersonalAnalysisJobResponse = z.infer<
  typeof multiProfilePersonalAnalysisJobResponseSchema
>;

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
  isFavourite: z.boolean().optional(),
  profileChips: z.array(profileFitChipSchema).optional(),
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
  productId: z.string().nullable().optional(),
  isFavourite: z.boolean().optional(),
  product: barcodeLookupProductSchema.nullable(),
  evaluation: productAnalysisResultSchema.nullable(),
  personalResult: personalAnalysisResultSchema.nullable(),
  multiProfileResult: multiProfilePersonalAnalysisResultSchema.nullable().optional(),
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

// ============================================================
// Favorites schemas
// ============================================================

export const addFavouriteRequestSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});
export type AddFavouriteRequest = z.infer<typeof addFavouriteRequestSchema>;

export const favouriteItemSchema = scanHistoryItemSchema.extend({
  favouriteId: z.string(),
});
export type FavouriteItem = z.infer<typeof favouriteItemSchema>;

export const favouritesResponseSchema = z.object({
  items: z.array(favouriteItemSchema),
  nextCursor: z.string().nullable(),
});
export type FavouritesResponse = z.infer<typeof favouritesResponseSchema>;

export const favouriteStatusResponseSchema = z.object({
  isFavourite: z.boolean(),
});
export type FavouriteStatusResponse = z.infer<typeof favouriteStatusResponseSchema>;

// ============================================================
// Family member schemas
// ============================================================

export const familyMemberSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  mainGoal: mainGoalSchema.nullable(),
  restrictions: z.array(restrictionSchema),
  allergies: z.array(allergySchema),
  otherAllergiesText: z.string().nullable(),
  nutritionPriorities: z.array(nutritionPrioritySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FamilyMember = z.infer<typeof familyMemberSchema>;

export const createFamilyMemberRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50, 'Name must be 50 characters or fewer'),
  mainGoal: mainGoalSchema.nullable().optional(),
  restrictions: z.array(restrictionSchema).optional().default([]),
  allergies: z.array(allergySchema).optional().default([]),
  otherAllergiesText: z.string().nullable().optional(),
  nutritionPriorities: z.array(nutritionPrioritySchema).optional().default([]),
});
export type CreateFamilyMemberRequest = z.infer<typeof createFamilyMemberRequestSchema>;

export const updateFamilyMemberRequestSchema = createFamilyMemberRequestSchema.partial();
export type UpdateFamilyMemberRequest = z.infer<typeof updateFamilyMemberRequestSchema>;

export const familyMembersResponseSchema = z.object({
  items: z.array(familyMemberSchema),
});
export type FamilyMembersResponse = z.infer<typeof familyMembersResponseSchema>;

// ============================================================
// Product lookup (lightweight, no analysis)
// ============================================================

export const productLookupRequestSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
});
export type ProductLookupRequest = z.infer<typeof productLookupRequestSchema>;

export const productPreviewSchema = z.object({
  productId: z.string(),
  barcode: z.string(),
  product_name: z.string().nullable(),
  brands: z.string().nullable(),
  image_url: z.string().nullable(),
});
export type ProductPreview = z.infer<typeof productPreviewSchema>;

export const productLookupResponseSchema = z.object({
  success: z.literal(true),
  product: productPreviewSchema,
});
export type ProductLookupResponse = z.infer<typeof productLookupResponseSchema>;

// ============================================================
// Product comparison schemas
// ============================================================

export const productComparisonItemSchema = z.object({
  positives: z.array(z.string()),
  negatives: z.array(z.string()),
});
export type ProductComparisonItem = z.infer<typeof productComparisonItemSchema>;

export const profileComparisonResultSchema = z.object({
  profileId: z.string(),
  profileName: z.string(),
  product1: productComparisonItemSchema,
  product2: productComparisonItemSchema,
  winner: z.enum(['product1', 'product2', 'tie']),
  conclusion: z.string(),
});
export type ProfileComparisonResult = z.infer<typeof profileComparisonResultSchema>;

export const productComparisonResultSchema = z.object({
  product1: productPreviewSchema,
  product2: productPreviewSchema,
  profiles: z.array(profileComparisonResultSchema),
});
export type ProductComparisonResult = z.infer<typeof productComparisonResultSchema>;

export const compareProductsRequestSchema = z.object({
  barcode1: z.string().min(1, 'First barcode is required'),
  barcode2: z.string().min(1, 'Second barcode is required'),
});
export type CompareProductsRequest = z.infer<typeof compareProductsRequestSchema>;

export const compareProductsResponseSchema = productComparisonResultSchema;
export type CompareProductsResponse = z.infer<typeof compareProductsResponseSchema>;
