import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { traceable } from 'langsmith/traceable';
import { ApiError } from '../../../shared/errors/api-error.js';
import { PRODUCT_ANALYZE_V2_AI_MODELS } from '../constants/photo-analysis.constants.js';
import {
  geminiPackagePhotoExtractionResultSchema,
  type GeminiPackagePhotoExtractionResult,
  type PackagePhotoExtractionResult,
  type UploadedPhotoFileV2,
} from '../types/analyze-photo-v2.types.js';
import {
  normalizeGeminiPackagePhotoExtractionResult,
  PACKAGE_PHOTO_EXTRACTION_PROMPT,
  PACKAGE_PHOTO_EXTRACTION_USER_PROMPT,
  toPackagePhotoInputs,
} from './package-photo-extraction.shared.js';
import {
  createPackagePhotoLangChainConfig,
  createPackagePhotoTraceableConfig,
  type PackagePhotoLangChainConfig,
  type PackagePhotoTraceContext,
} from './package-photo-tracing.util.js';

interface StructuredInvoker<T> {
  invoke(input: unknown, options?: PackagePhotoLangChainConfig): Promise<T>;
}

const buildPhotoContent = (photos: ReturnType<typeof toPackagePhotoInputs>) => {
  return photos.flatMap((photo) => [
    {
      type: 'text',
      text: `Package photo ${photo.index + 1}`,
    },
    {
      type: 'image_url',
      image_url: { url: `data:${photo.mimetype};base64,${photo.imageBase64}` },
    },
  ]);
};

export const extractPackageProductDataWithGemini: (
  files: UploadedPhotoFileV2[],
  traceContext: PackagePhotoTraceContext,
) => Promise<PackagePhotoExtractionResult> = traceable(
  async (
    files: UploadedPhotoFileV2[],
    traceContext: PackagePhotoTraceContext,
  ): Promise<PackagePhotoExtractionResult> => {
    const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw ApiError.badGateway(
        'Gemini processing service is not configured',
        'AI_SERVICE_UNAVAILABLE',
      );
    }

    const photos = toPackagePhotoInputs(files);
    const model = new ChatGoogleGenerativeAI({
      apiKey,
      maxRetries: 1,
      model: PRODUCT_ANALYZE_V2_AI_MODELS.geminiVision,
      temperature: 0.1,
      topP: 0.8,
    });
    const structuredModel = model.withStructuredOutput(geminiPackagePhotoExtractionResultSchema, {
      method: 'functionCalling',
      name: 'product_package_photo_extraction',
    }) as StructuredInvoker<GeminiPackagePhotoExtractionResult>;

    const result = await structuredModel.invoke(
      [
        new SystemMessage(PACKAGE_PHOTO_EXTRACTION_PROMPT),
        new HumanMessage({
          content: [
            {
              type: 'text',
              text: PACKAGE_PHOTO_EXTRACTION_USER_PROMPT,
            },
            ...buildPhotoContent(photos),
          ],
        }),
      ],
      createPackagePhotoLangChainConfig(traceContext, 'package-photo-extraction-gemini-model'),
    );

    return normalizeGeminiPackagePhotoExtractionResult(
      geminiPackagePhotoExtractionResultSchema.parse(result),
    );
  },
  createPackagePhotoTraceableConfig('gemini'),
);
