import { z } from 'zod';
import type { UploadedImageFile } from '../../../shared/utils/upload.js';
import { VALID_PRODUCT_ROLES } from './product-role.types.js';
import type { AnalyzeBarcodeV2Response } from './analyze-product-v2.types.js';

const photoOcrPayloadV2BaseShape = {
  allText: z.string(),
  productName: z.string().nullable(),
  brand: z.string().nullable(),
  isFoodProduct: z.boolean(),
};

export const photoOcrStructuredPayloadV2Schema = z.object({
  ...photoOcrPayloadV2BaseShape,
  isPackagedProduct: z.boolean().nullable(),
});

export const photoOcrPayloadV2Schema = z.object({
  ...photoOcrPayloadV2BaseShape,
  isPackagedProduct: z.boolean().nullable().optional(),
});

const nullableNutritionValueSchema = z.number().nullable();

export const packagePhotoNutritionSchema = z.object({
  fat_100g: nullableNutritionValueSchema,
  salt_100g: nullableNutritionValueSchema,
  fiber_100g: nullableNutritionValueSchema,
  sodium_100g: nullableNutritionValueSchema,
  sugars_100g: nullableNutritionValueSchema,
  proteins_100g: nullableNutritionValueSchema,
  energy_kcal_100g: nullableNutritionValueSchema,
  carbohydrates_100g: nullableNutritionValueSchema,
  saturated_fat_100g: nullableNutritionValueSchema,
});

export const geminiPackagePhotoNutritionSchema = z
  .object({
    fat_100g: z.number().optional().describe('Total fat in grams per 100 g.'),
    salt_100g: z
      .number()
      .optional()
      .describe(
        'Salt in grams per 100 g. If salt is missing but sodium is visible, use sodium_100g * 2.5.',
      ),
    fiber_100g: z.number().optional().describe('Dietary fiber in grams per 100 g.'),
    sodium_100g: z
      .number()
      .optional()
      .describe('Sodium in grams per 100 g. Convert visible milligrams to grams.'),
    sugars_100g: z.number().optional().describe('Total sugars in grams per 100 g.'),
    proteins_100g: z.number().optional().describe('Protein in grams per 100 g.'),
    energy_kcal_100g: z.number().optional().describe('Energy in kcal per 100 g.'),
    carbohydrates_100g: z.number().optional().describe('Total carbohydrates in grams per 100 g.'),
    saturated_fat_100g: z.number().optional().describe('Saturated fat in grams per 100 g.'),
  })
  .describe(
    'Nutrition values normalized to per 100 g. Use visible per-100g values directly, or convert visible per-serving values when serving size grams are visible.',
  );

export const packagePhotoExtractionResultSchema = z.object({
  productName: z.string().nullable(),
  productBrand: z.string().nullable(),
  productRole: z.enum(VALID_PRODUCT_ROLES).nullable(),
  ingredients: z.array(z.string()),
  traces: z.array(z.string()),
  nutrition: packagePhotoNutritionSchema,
});

export const geminiPackagePhotoExtractionResultSchema = z.object({
  productName: z.string().optional().default('').describe('Exact visible product name.'),
  productBrand: z.string().optional().default('').describe('Exact visible product brand.'),
  productRole: z.enum(VALID_PRODUCT_ROLES).optional().describe('Best matching product type.'),
  ingredients: z
    .array(z.string())
    .default([])
    .describe('Visible ingredient list split into items.'),
  traces: z
    .array(z.string())
    .default([])
    .describe('Normalized trace allergens found in may-contain or traces statements.'),
  nutrition: geminiPackagePhotoNutritionSchema.default({}),
});

export const packagePhotoMissingFieldSchema = z.enum(['ingredients', 'nutritionFacts']);

export type UploadedPhotoFileV2 = UploadedImageFile;

export interface AnalyzePhotoV2Input {
  imageBase64: string;
  userId: string;
  ocr?: PhotoOcrPayloadV2;
}

export type PhotoOcrPayloadV2 = z.infer<typeof photoOcrPayloadV2Schema>;
export type GeminiPackagePhotoExtractionResult = z.infer<
  typeof geminiPackagePhotoExtractionResultSchema
>;
export type PackagePhotoExtractionResult = z.infer<typeof packagePhotoExtractionResultSchema>;
export type PackagePhotoMissingField = z.infer<typeof packagePhotoMissingFieldSchema>;
export type AnalyzePhotoV2Response = AnalyzeBarcodeV2Response & {
  barcode: string;
};

export interface PackagePhotosNeedsMoreResponse {
  status: 'needs_more_photos';
  missingFields: PackagePhotoMissingField[];
  message: string;
}

export type PackagePhotoCoverageCode = 0 | 1 | 2 | 3;

export interface PackagePhotosCoverageResponse {
  status: 'complete' | 'needs_more_photos';
  coverage: PackagePhotoCoverageCode;
  missingFields: PackagePhotoMissingField[];
  message?: string;
}

export type PackagePhotosV2Response = AnalyzePhotoV2Response | PackagePhotosNeedsMoreResponse;
