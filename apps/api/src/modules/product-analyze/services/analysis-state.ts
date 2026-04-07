import {
  productAnalysisResultSchema,
  type AnalysisJobResponse,
  type AnalysisSocketEventPayload,
  type NormalizedProduct,
  type ProductAnalysisResult,
} from '@acme/shared';

type AnalysisStatus = AnalysisJobResponse['status'];

interface BuildAnalysisStateInput {
  analysisId: string;
  productStatus: AnalysisStatus;
  ingredientsStatus: AnalysisStatus;
  result?: ProductAnalysisResult;
  error?: AnalysisJobResponse['error'];
}

export interface BuildAnalysisSocketPayloadInput
  extends BuildAnalysisStateInput {
  scanId?: string;
  productId?: string;
  barcode?: string;
}

interface StoredAnalysisStateInput {
  analysisId: string;
  status: AnalysisStatus | null;
  result?: unknown;
  scanId?: string | null;
  productId?: string | null;
  barcode?: string | null;
}

const getOverallStatus = (
  productStatus: AnalysisStatus,
  ingredientsStatus: AnalysisStatus,
): AnalysisStatus => {
  if (productStatus === 'failed' || ingredientsStatus === 'failed') {
    return 'failed';
  }

  if (productStatus === 'completed' && ingredientsStatus === 'completed') {
    return 'completed';
  }

  return 'pending';
};

export const buildAnalysisResponse = (
  input: BuildAnalysisStateInput,
): AnalysisJobResponse => ({
  analysisId: input.analysisId,
  status: getOverallStatus(input.productStatus, input.ingredientsStatus),
  productStatus: input.productStatus,
  ingredientsStatus: input.ingredientsStatus,
  ...(input.result ? { result: input.result } : {}),
  ...(input.error ? { error: input.error } : {}),
});

export const buildAnalysisSocketPayload = (
  input: BuildAnalysisSocketPayloadInput,
): AnalysisSocketEventPayload => ({
  ...buildAnalysisResponse(input),
  ...(input.scanId ? { scanId: input.scanId } : {}),
  ...(input.productId ? { productId: input.productId } : {}),
  ...(input.barcode ? { barcode: input.barcode } : {}),
});

export const parseStoredAnalysisResult = (
  value: unknown,
): ProductAnalysisResult | undefined => {
  const parsed = productAnalysisResultSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

export const buildAnalysisResponseFromStoredState = (
  input: StoredAnalysisStateInput,
): AnalysisSocketEventPayload => {
  const result = parseStoredAnalysisResult(input.result);
  const storedStatus = input.status ?? (result ? 'completed' : 'pending');
  const productStatus = result
    ? 'completed'
    : storedStatus === 'failed'
      ? 'failed'
      : 'pending';

  return buildAnalysisSocketPayload({
    analysisId: input.analysisId,
    scanId: input.scanId ?? undefined,
    productId: input.productId ?? undefined,
    barcode: input.barcode ?? undefined,
    productStatus,
    ingredientsStatus: storedStatus,
    result,
  });
};

export const hasIngredientData = (product: NormalizedProduct): boolean => {
  if (product.ingredients_text?.trim()) {
    return true;
  }

  return product.ingredients.length > 0;
};

export const getScanSummary = (result?: ProductAnalysisResult) => {
  const primaryProfile = result?.profiles[0];

  return {
    overallScore: primaryProfile?.score ?? null,
    overallRating: primaryProfile?.fitLabel ?? null,
  };
};