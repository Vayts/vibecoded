import { z } from 'zod';
import { photoOcrPayloadSchema } from '../product-analyze/product-analyze.schemas';

export interface UploadedPhotoFile {
  buffer: Buffer;
  size: number;
  mimetype: string;
}

export const photoScanRequestSchema = z.object({
  imageBase64: z.string(),
  ocr: photoOcrPayloadSchema.nullable().optional(),
});

export const photoOcrRequestSchema = z.object({
  imageBase64: z.string(),
});

export type PhotoScanRequest = z.infer<typeof photoScanRequestSchema>;
export type PhotoOcrRequest = z.infer<typeof photoOcrRequestSchema>;
