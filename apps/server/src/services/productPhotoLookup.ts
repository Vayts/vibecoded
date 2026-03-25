import {
  barcodeLookupProductSchema,
  type BarcodeLookupResponse,
} from '@acme/shared';
import { ChatOpenAI, tools } from '@langchain/openai';
import { z } from 'zod';

import { enrichPhotoProduct } from './productPhotoEnrichment';
import { getPhotoIdentificationPrompt, getPhotoResearchPrompt } from './productPhotoPrompts';
import {
  extractJsonObject,
  getResponseText,
  hasEnoughProductEvidence,
  MAX_UPLOAD_BYTES,
  MIN_IDENTIFICATION_CONFIDENCE,
  MIN_RESEARCH_CONFIDENCE,
  normalizeSyntheticCode,
  photoIdentificationSchema,
  PHOTO_SOURCE,
  researchedProductSchema,
} from './productPhotoLookupSchema';
import { AI_MODELS } from './prompts';
import { createScanNotFoundResponse, createScanSuccessResponse } from './scannerLookupResponse';

export class ProductPhotoLookupError extends Error {
  constructor(
    public readonly code: 'INVALID_UPLOAD' | 'UPSTREAM_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'ProductPhotoLookupError';
  }
}

const identificationModel = new ChatOpenAI({
  model: AI_MODELS.vision,
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
});

const researchModel = new ChatOpenAI({
  model: AI_MODELS.vision,
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
});

const toBase64 = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
};

const identifyProductFromPhoto = async (imageUrl: string) => {
  // LangChain typing remains too deep for strict TS on structured multimodal output.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const structuredModel = (identificationModel as any).withStructuredOutput(photoIdentificationSchema);

  return structuredModel.invoke([
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: getPhotoIdentificationPrompt(),
        },
        {
          type: 'image_url',
          image_url: {
            url: imageUrl,
            detail: 'high',
          },
        },
      ],
    },
  ]);
};

const researchProduct = async (
  imageUrl: string,
  identification: z.infer<typeof photoIdentificationSchema>,
) => {
  const response = await researchModel.invoke(
    [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: getPhotoResearchPrompt(identification),
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high',
            },
          },
        ],
      },
    ],
    {
      tools: [tools.webSearch({ search_context_size: 'medium' })],
    },
  );

  return researchedProductSchema.parse(extractJsonObject(getResponseText(response.content)));
};

const toNormalizedProduct = (product: z.infer<typeof researchedProductSchema>['product']) => {
  const normalizedProduct = barcodeLookupProductSchema.parse({
    ...product,
    code: product.code ?? normalizeSyntheticCode(product),
  });

  return normalizedProduct;
};

export const lookupProductByPhoto = async (
  photo: File,
  userId?: string,
): Promise<BarcodeLookupResponse> => {
  if (!photo.type.startsWith('image/')) {
    throw new ProductPhotoLookupError('INVALID_UPLOAD', 'Photo upload must be an image');
  }

  if (photo.size > MAX_UPLOAD_BYTES) {
    throw new ProductPhotoLookupError('INVALID_UPLOAD', 'Photo upload exceeds 8MB limit');
  }

  const imageBase64 = await toBase64(photo);
  const imageUrl = `data:${photo.type || 'image/jpeg'};base64,${imageBase64}`;
  const identification = photoIdentificationSchema.parse(await identifyProductFromPhoto(imageUrl));

  if (
    !identification.isFoodProduct ||
    !identification.isPackagedFoodProduct ||
    identification.confidence < MIN_IDENTIFICATION_CONFIDENCE
  ) {
    return createScanNotFoundResponse('photo-upload', PHOTO_SOURCE);
  }

  const researchedProduct = await researchProduct(imageUrl, identification);
  const enrichedProduct = enrichPhotoProduct(researchedProduct.product, identification);
  if (
    !researchedProduct.confidentlyIdentified ||
    researchedProduct.confidence < MIN_RESEARCH_CONFIDENCE ||
    !hasEnoughProductEvidence(enrichedProduct)
  ) {
    return createScanNotFoundResponse('photo-upload', PHOTO_SOURCE);
  }

  const normalizedProduct = toNormalizedProduct(enrichedProduct);
  return createScanSuccessResponse(normalizedProduct.code, PHOTO_SOURCE, normalizedProduct, userId);
};