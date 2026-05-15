import type { TraceableConfig } from 'langsmith/traceable';
import type { RunnableConfigLike } from 'langsmith/run_trees';
import type {
  PackagePhotoExtractionResult,
  UploadedPhotoFileV2,
} from '../types/analyze-photo-v2.types.js';

type PackagePhotoTraceProvider = 'gemini';
type PackagePhotoTraceEndpoint = 'package-photos';

interface PackagePhotoTraceContextInput {
  endpoint: PackagePhotoTraceEndpoint;
  files: UploadedPhotoFileV2[];
  metadata?: unknown;
  provider: PackagePhotoTraceProvider;
  userId: string;
}

export interface PackagePhotoTraceContext {
  endpoint: PackagePhotoTraceEndpoint;
  files: UploadedPhotoFileV2[];
  metadata: unknown;
  photoCount: number;
  provider: PackagePhotoTraceProvider;
  userId: string;
}

export interface PackagePhotoLangChainConfig extends RunnableConfigLike {
  runName: string;
}

interface TraceablePackagePhotoExtractor {
  (
    files: UploadedPhotoFileV2[],
    traceContext: PackagePhotoTraceContext,
  ): Promise<PackagePhotoExtractionResult>;
}

const TRUTHY_ENV_VALUES = new Set(['1', 'true', 'yes', 'on']);

const parseRequestMetadata = (metadata: unknown): unknown => {
  if (typeof metadata !== 'string') {
    return metadata ?? null;
  }

  const trimmed = metadata.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed.slice(0, 2_000);
  }
};

const summarizeFiles = (files: UploadedPhotoFileV2[]) => {
  return files.map((file, index) => ({
    index,
    mimetype: file.mimetype,
    size: file.size,
  }));
};

const summarizeExtractionResult = (result: PackagePhotoExtractionResult) => ({
  ingredients: result.ingredients,
  ingredientsEnglish: result.ingredientsEnglish,
  ingredientsCount: result.ingredients.length,
  productBrand: result.productBrand,
  productName: result.productName,
  productNameEnglish: result.productNameEnglish,
  productRole: result.productRole,
  nutrition: result.nutrition,
  nutritionFieldCount: Object.values(result.nutrition).filter((value) => value !== null).length,
});

export const isLangSmithTracingEnabled = (): boolean => {
  const tracingFlag = process.env.LANGSMITH_TRACING ?? process.env.LANGCHAIN_TRACING_V2;
  return Boolean(
    tracingFlag &&
    TRUTHY_ENV_VALUES.has(tracingFlag.trim().toLowerCase()) &&
    process.env.LANGSMITH_API_KEY,
  );
};

export const createPackagePhotoTraceContext = (
  input: PackagePhotoTraceContextInput,
): PackagePhotoTraceContext => ({
  endpoint: input.endpoint,
  files: input.files,
  metadata: parseRequestMetadata(input.metadata),
  photoCount: input.files.length,
  provider: input.provider,
  userId: input.userId,
});

export const createPackagePhotoTraceableConfig = (
  provider: PackagePhotoTraceProvider,
): TraceableConfig<TraceablePackagePhotoExtractor> => ({
  name: `package-photo-extraction-${provider}`,
  run_type: 'chain',
  tags: ['package-photo-extraction', provider],
  tracingEnabled: isLangSmithTracingEnabled(),
  processInputs: (inputs) => {
    const [files, traceContext] = 'args' in inputs ? inputs.args : [[], undefined];

    return {
      endpoint: traceContext?.endpoint ?? null,
      files: summarizeFiles(files as UploadedPhotoFileV2[]),
      metadata: traceContext?.metadata ?? null,
      photoCount: traceContext?.photoCount ?? 0,
      provider: traceContext?.provider ?? provider,
      userId: traceContext?.userId ?? null,
    };
  },
  processOutputs: (outputs) => {
    const result = 'outputs' in outputs ? outputs.outputs : outputs;
    return summarizeExtractionResult(result as PackagePhotoExtractionResult);
  },
});

export const createPackagePhotoLangChainConfig = (
  traceContext: PackagePhotoTraceContext,
  runName: string,
): PackagePhotoLangChainConfig => ({
  metadata: {
    endpoint: traceContext.endpoint,
    metadata: traceContext.metadata,
    photoCount: traceContext.photoCount,
    provider: traceContext.provider,
    userId: traceContext.userId,
  },
  runName,
  tags: ['package-photo-extraction', traceContext.provider],
});
