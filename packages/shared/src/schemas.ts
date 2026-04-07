import { z } from 'zod';
import {
  mainGoalSchema,
  restrictionSchema,
  allergySchema,
  nutritionPrioritySchema,
} from './onboarding';
import {
  analysisJobStatusSchema,
  fitLabelSchema,
  productAnalysisResultSchema as productAnalysisResultSchemaFromPA,
} from './product-analysis';
import { barcodeLookupProductSchema } from './scanner-core-schemas';

export * from './scanner-core-schemas';

// ============================================================
// Profile chip schema (lightweight summary for history lists)
// ============================================================

export const profileChipSchema = z.object({
  profileId: z.string(),
  name: z.string(),
  score: z.number().min(0).max(100),
  fitLabel: fitLabelSchema,
});
export type ProfileChip = z.infer<typeof profileChipSchema>;

// ============================================================
// Scan history schemas
// ============================================================

export const scanSourceSchema = z.enum(['barcode', 'photo']);
export type ScanSource = z.infer<typeof scanSourceSchema>;

export const scanTypeSchema = z.enum(['product', 'comparison']);
export type ScanType = z.infer<typeof scanTypeSchema>;

const scanHistoryProductSchema = z.object({
  id: z.string(),
  barcode: z.string(),
  product_name: z.string().nullable(),
  brands: z.string().nullable(),
  image_url: z.string().nullable(),
});

export const scanHistoryItemSchema = z.object({
  id: z.string(),
  type: scanTypeSchema,
  analysisId: z.string().nullable().optional(),
  createdAt: z.string(),
  source: scanSourceSchema,
  overallScore: z.number().nullable(),
  overallRating: z.string().nullable(),
  personalScore: z.number().nullable(),
  personalRating: fitLabelSchema.nullable(),
  personalAnalysisStatus: analysisJobStatusSchema.nullable(),
  isFavourite: z.boolean().optional(),
  profileChips: z.array(profileChipSchema).optional(),
  product: scanHistoryProductSchema.nullable(),
  product2: scanHistoryProductSchema.nullable().optional(),
});
export type ScanHistoryItem = z.infer<typeof scanHistoryItemSchema>;

export const scanHistoryResponseSchema = z.object({
  items: z.array(scanHistoryItemSchema),
  nextCursor: z.string().nullable(),
});
export type ScanHistoryResponse = z.infer<typeof scanHistoryResponseSchema>;

export const scanDetailResponseSchema = z.object({
  id: z.string(),
  type: scanTypeSchema,
  analysisId: z.string().nullable(),
  createdAt: z.string(),
  source: scanSourceSchema,
  overallScore: z.number().nullable(),
  overallRating: z.string().nullable(),
  personalAnalysisStatus: analysisJobStatusSchema.nullable(),
  barcode: z.string().nullable(),
  productId: z.string().nullable().optional(),
  isFavourite: z.boolean().optional(),
  product: barcodeLookupProductSchema.nullable(),
  analysisResult: productAnalysisResultSchemaFromPA.nullable(),
  comparisonResult: z.lazy(() => productComparisonResultSchema).nullable().optional(),
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
// Comparison history schemas
// ============================================================

export const comparisonHistoryItemSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  product1: scanHistoryProductSchema.nullable(),
  product2: scanHistoryProductSchema.nullable(),
});
export type ComparisonHistoryItem = z.infer<typeof comparisonHistoryItemSchema>;

export const comparisonHistoryResponseSchema = z.object({
  items: z.array(comparisonHistoryItemSchema),
  nextCursor: z.string().nullable(),
});
export type ComparisonHistoryResponse = z.infer<typeof comparisonHistoryResponseSchema>;

export const comparisonDetailResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  comparisonResult: z.lazy(() => productComparisonResultSchema).nullable(),
});
export type ComparisonDetailResponse = z.infer<typeof comparisonDetailResponseSchema>;

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
  nutriscore_grade: z.string().nullable().optional(),
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

export const comparisonNutritionSchema = z.object({
  calories: z.number().nullable(),
  protein: z.number().nullable(),
  fat: z.number().nullable(),
  sugars: z.number().nullable(),
  fiber: z.number().nullable(),
  salt: z.number().nullable(),
  saturatedFat: z.number().nullable(),
  nutriscore_grade: z.string().nullable(),
});
export type ComparisonNutrition = z.infer<typeof comparisonNutritionSchema>;

export const comparisonProductPreviewSchema = productPreviewSchema.extend({
  nutrition: comparisonNutritionSchema,
});
export type ComparisonProductPreview = z.infer<typeof comparisonProductPreviewSchema>;

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
  winner: z.enum(['product1', 'product2', 'tie', 'neither']),
  conclusion: z.string(),
});
export type ProfileComparisonResult = z.infer<typeof profileComparisonResultSchema>;

export const productComparisonResultSchema = z.object({
  product1: comparisonProductPreviewSchema,
  product2: comparisonProductPreviewSchema,
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
