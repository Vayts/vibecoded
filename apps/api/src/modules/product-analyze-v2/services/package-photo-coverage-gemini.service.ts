import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { traceable } from 'langsmith/traceable';
import { ApiError } from '../../../shared/errors/api-error.js';
import { PRODUCT_ANALYZE_V2_AI_MODELS } from '../constants/photo-analysis.constants.js';
import {
  packagePhotoCoverageResultSchema,
  type PackagePhotoCoverageCode,
  type PackagePhotoCoverageResult,
  type UploadedPhotoFileV2,
} from '../types/analyze-photo-v2.types.js';
import { toPackagePhotoInputs } from './package-photo-extraction.shared.js';
import { isLangSmithTracingEnabled } from './package-photo-tracing.util.js';

interface StructuredInvoker<T> {
  invoke(
    input: unknown,
    options?: { metadata?: Record<string, unknown>; runName: string; tags: string[] },
  ): Promise<T>;
}

interface CoverageTraceContext {
  metadata: unknown;
  userId: string;
}

const COVERAGE_PROMPT = `You check whether one package photo visibly contains nutrition facts and ingredients.

Return one JSON object with only this field:
- coverage: number
Coverage codes:
- 0: neither nutrition facts nor ingredients are visible/readable.
- 1: both nutrition facts and ingredients are visible/readable.
- 2: ingredients are visible/readable, but nutrition facts are missing/unreadable.
- 3: nutrition facts are visible/readable, but ingredients are missing/unreadable.
Rules:
- Do not extract product data. Only classify panel coverage.
- Treat blurry, glared, cropped, or unreadable panels as missing.
- Return only one of these coverage codes: 0, 1, 2, or 3.
Return valid JSON only`;

const COVERAGE_USER_PROMPT = 'Check this package photo and return the numeric coverage code.';

const buildPhotoContent = (photo: ReturnType<typeof toPackagePhotoInputs>[number]) => [
  {
    type: 'text',
    text: 'Package photo',
  },
  {
    type: 'image_url',
    image_url: { url: `data:${photo.mimetype};base64,${photo.imageBase64}` },
  },
];

export const checkPackagePhotoCoverageWithGemini: (
  file: UploadedPhotoFileV2,
  traceContext: CoverageTraceContext,
) => Promise<PackagePhotoCoverageCode> = traceable(
  async (
    file: UploadedPhotoFileV2,
    traceContext: CoverageTraceContext,
  ): Promise<PackagePhotoCoverageCode> => {
    const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw ApiError.badGateway(
        'Gemini processing service is not configured',
        'AI_SERVICE_UNAVAILABLE',
      );
    }

    const [photo] = toPackagePhotoInputs([file]);
    const model = new ChatGoogleGenerativeAI({
      apiKey,
      maxRetries: 1,
      model: PRODUCT_ANALYZE_V2_AI_MODELS.geminiVision,
      temperature: 0,
      topP: 0.8,
    });
    const structuredModel = model.withStructuredOutput(packagePhotoCoverageResultSchema, {
      method: 'functionCalling',
      name: 'product_package_photo_coverage_check',
    }) as StructuredInvoker<PackagePhotoCoverageResult>;

    const result = await structuredModel.invoke(
      [
        new SystemMessage(COVERAGE_PROMPT),
        new HumanMessage({
          content: [
            {
              type: 'text',
              text: COVERAGE_USER_PROMPT,
            },
            ...buildPhotoContent(photo),
          ],
        }),
      ],
      {
        metadata: {
          endpoint: 'package-photos/coverage',
          metadata: traceContext.metadata,
          provider: 'gemini',
          userId: traceContext.userId,
        },
        runName: 'package-photo-coverage-gemini-model',
        tags: ['package-photo-coverage', 'gemini'],
      },
    );

    return packagePhotoCoverageResultSchema.parse(result).coverage;
  },
  {
    name: 'package-photo-coverage-gemini',
    run_type: 'chain',
    tags: ['package-photo-coverage', 'gemini'],
    tracingEnabled: isLangSmithTracingEnabled(),
  },
);
