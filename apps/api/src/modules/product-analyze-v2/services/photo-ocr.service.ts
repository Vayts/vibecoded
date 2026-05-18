import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { PRODUCT_ANALYZE_V2_AI_MODELS } from '../constants/photo-analysis.constants.js';
import {
  photoOcrStructuredPayloadV2Schema,
  photoOcrPayloadV2Schema,
  type PhotoOcrPayloadV2,
} from '../types/analyze-photo-v2.types.js';
import { createProductAnalyzeV2Logger } from '../utils/product-analyze-v2-logger.util.js';

const logger = createProductAnalyzeV2Logger('photo-ocr');

interface StructuredInvoker<T> {
  invoke(input: unknown): Promise<T>;
}

const OCR_SYSTEM_PROMPT = `You are an OCR specialist. Given a photo, extract ALL visible text exactly as it appears on the packaging. Do not translate anything.

Rules:
- Transcribe every readable piece of visible text: product name, brand, ingredients, nutrition facts, weight, claims, and labels.
- Preserve the original language exactly as printed.
- Identify the most likely product name and brand from the visible text.
- Determine whether this is a human food or beverage product.
- Determine whether the image shows a packaged retail food or beverage product that can be analyzed reliably at the product level.
- Do not guess or invent text that is not visible in the image.

Food classification:
- Set isFoodProduct=true only when the photo clearly shows a human food or beverage product.
- Set isFoodProduct=false for non-food items, supplements, medicine, pet food, menus, receipts, shelves, or ambiguous objects.

Packaging classification:
- Set isPackagedProduct=true only when the image clearly shows consumer packaging or a product label for a retail food or beverage item.
- Strong packaging evidence includes a branded pack, ingredients panel, nutrition facts panel, barcode on packaging, or other printed package labeling.
- Set isPackagedProduct=false for loose produce, single raw ingredients, plated meals, homemade food, bakery-counter items without visible packaging, bulk/bin foods, or images that show only the food item itself.
- If the item is food but you cannot see clear packaging or label evidence, set isPackagedProduct=false.`;

export async function extractTextFromPhotoV2(
  imageBase64: string,
): Promise<PhotoOcrPayloadV2 | null> {
  if (!process.env.OPENAI_API_KEY) {
    logger.error('OPENAI_API_KEY is not set');
    return null;
  }

  const model = new ChatOpenAI({
    model: PRODUCT_ANALYZE_V2_AI_MODELS.vision,
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 1,
  });
  const structuredModel = model.withStructuredOutput(photoOcrStructuredPayloadV2Schema, {
    method: 'jsonSchema',
    name: 'product_analyze_v2_photo_ocr',
  }) as StructuredInvoker<PhotoOcrPayloadV2>;

  const result = await structuredModel.invoke([
    new SystemMessage(OCR_SYSTEM_PROMPT),
    new HumanMessage({
      content: [
        {
          type: 'text',
          text: 'Extract visible product text, identify the product name and brand, and decide whether this is a packaged food product with visible label evidence.',
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
