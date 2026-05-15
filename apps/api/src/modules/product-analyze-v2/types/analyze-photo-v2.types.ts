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

export const geminiPackagePhotoNutritionSchema = z.object({
  fat_100g: z.number().optional(),
  salt_100g: z.number().optional(),
  fiber_100g: z.number().optional(),
  sodium_100g: z.number().optional(),
  sugars_100g: z.number().optional(),
  proteins_100g: z.number().optional(),
  energy_kcal_100g: z.number().optional(),
  carbohydrates_100g: z.number().optional(),
  saturated_fat_100g: z.number().optional(),
});

export const packagePhotoExtractionResultSchema = z.object({
  productName: z.string().nullable(),
  productBrand: z.string().nullable(),
  productRole: z.enum(VALID_PRODUCT_ROLES).nullable(),
  ingredients: z.array(z.string()),
  nutrition: packagePhotoNutritionSchema,
});

export const geminiPackagePhotoExtractionResultSchema = z.object({
  productName: z.string().optional().default(''),
  productBrand: z.string().optional().default(''),
  productRole: z.enum(VALID_PRODUCT_ROLES).optional(),
  ingredients: z.array(z.string()).default([]),
  nutrition: geminiPackagePhotoNutritionSchema.default({}),
});

export const packagePhotoCoverageResultSchema = z.object({
  coverage: z.number().int().min(0).max(3),
});

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
export type PackagePhotoCoverageResult = z.infer<typeof packagePhotoCoverageResultSchema>;
export type AnalyzePhotoV2Response = AnalyzeBarcodeV2Response & {
  barcode: string;
};
