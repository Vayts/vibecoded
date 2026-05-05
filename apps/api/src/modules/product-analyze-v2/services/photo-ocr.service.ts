import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { PRODUCT_ANALYZE_V2_AI_MODELS } from '../constants/photo-analysis.constants.js';
import {
  photoOcrPayloadV2Schema,
  type PhotoOcrPayloadV2,
} from '../types/analyze-photo-v2.types.js';

interface StructuredInvoker<T> {
  invoke(input: unknown): Promise<T>;
}

const OCR_SYSTEM_PROMPT = `You are an OCR specialist. Given a photo, extract ALL visible text exactly as it appears on the packaging. Do not translate anything.

Rules:
- Transcribe every readable piece of visible text: product name, brand, ingredients, nutrition facts, weight, claims, and labels.
- Preserve the original language exactly as printed.
- Identify the most likely product name and brand from the visible text.
- Determine whether this is a human food or beverage product.
- Do not guess or invent text that is not visible in the image.

Food classification:
- Set isFoodProduct=true only when the photo clearly shows a human food or beverage product.
- Set isFoodProduct=false for non-food items, supplements, medicine, pet food, menus, receipts, shelves, or ambiguous objects.`;

export async function extractTextFromPhotoV2(
  imageBase64: string,
): Promise<PhotoOcrPayloadV2 | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('[ProductAnalyzeV2:photo-ocr] OPENAI_API_KEY is not set');
    return null;
  }

  const model = new ChatOpenAI({
    model: PRODUCT_ANALYZE_V2_AI_MODELS.vision,
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 1,
  });
  const structuredModel = model.withStructuredOutput(photoOcrPayloadV2Schema, {
    method: 'jsonSchema',
    name: 'product_analyze_v2_photo_ocr',
  }) as StructuredInvoker<PhotoOcrPayloadV2>;

  const result = await structuredModel.invoke([
    new SystemMessage(OCR_SYSTEM_PROMPT),
    new HumanMessage({
      content: [
        {
          type: 'text',
          text: 'Extract visible product text, product name, and brand from this photo.',
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        },
      ],
    }),
  ]);

  return photoOcrPayloadV2Schema.parse(result);
}
