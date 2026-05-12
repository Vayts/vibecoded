import { z } from 'zod';
import type { UploadedImageFile } from '../../../shared/utils/upload.js';
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

export type UploadedPhotoFileV2 = UploadedImageFile;

export interface AnalyzePhotoV2Input {
  imageBase64: string;
  userId: string;
  ocr?: PhotoOcrPayloadV2;
}

export type PhotoOcrPayloadV2 = z.infer<typeof photoOcrPayloadV2Schema>;
export type AnalyzePhotoV2Response = AnalyzeBarcodeV2Response & {
  barcode: string;
};
