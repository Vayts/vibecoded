import { z } from 'zod';

export const photoOcrPayloadSchema = z.object({
  allText: z.string(),
  productName: z.string().nullable(),
  brand: z.string().nullable(),
  isFoodProduct: z.boolean(),
});

export type PhotoOcrPayload = z.infer<typeof photoOcrPayloadSchema>;

export interface AnalyzePhotoInput {
  imageBase64: string;
  userId: string;
  ocr?: PhotoOcrPayload;
}
