import { prisma } from '../../../../../shared/lib/prisma.js';
import type { AnalyzeBarcodeV2Response } from '../../../types/analyze-product-v2.types.js';
import { hasEnoughProductInformation } from '../../../utils/normalize-open-food-facts-product.util.js';
import { ApiError } from '../../../../../shared/errors/api-error.js';
import { withResolvedCanIHaveThisStatuses } from './profile-results.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function hasOwnEnglishNameField(value: unknown): boolean {
  return Boolean(isRecord(value) && Object.prototype.hasOwnProperty.call(value, 'englishName'));
}

function isAnalyzeBarcodeV2Response(value: unknown): value is AnalyzeBarcodeV2Response {
  if (!isRecord(value) || !isRecord(value.product) || !Array.isArray(value.profiles)) {
    return false;
  }

  const { product } = value;
  return (
    product.isFoodProduct === true &&
    hasOwnEnglishNameField(product) &&
    isStringArray(product.ingredients) &&
    isStringArray(product.allergens) &&
    isStringArray(product.traces) &&
    isStringArray(product.additives) &&
    isRecord(product.nutrition)
  );
}

function hasEnoughCachedProductInformation(
  response: AnalyzeBarcodeV2Response,
  barcode: string,
): boolean {
  return hasEnoughProductInformation({
    barcode,
    name: response.product.name,
    brand: response.product.brand,
    imageUrl: response.product.imageUrl,
    ingredients: response.product.ingredients,
    allergens: response.product.allergens,
    traces: response.product.traces,
    additives: response.product.additives,
    categories: [],
    servingSizeText: null,
    servingSizeGrams: null,
    servingSizeMl: null,
    nutrition: {
      ...response.product.nutrition,
      saltPer100g: null,
    },
  });
}

function canReuseAnalysis(createdAt: Date, preferencesUpdatedAt: Date | null): boolean {
  return !preferencesUpdatedAt || createdAt > preferencesUpdatedAt;
}

export async function findReusableAnalyzedProductByBarcode(input: {
  barcode: string;
  userId: string;
}): Promise<{
  barcode: string;
  result: AnalyzeBarcodeV2Response;
  reusedExistingAnalysis: boolean;
  productId?: string;
  scanId?: string;
} | null> {
  const [user, scans] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { analysisPreferencesUpdatedAt: true },
    }),
    prisma.scan.findMany({
      where: {
        userId: input.userId,
        barcode: input.barcode,
        personalAnalysisStatus: 'completed',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        productId: true,
        createdAt: true,
        multiProfileResult: true,
      },
    }),
  ]);

  if (!user) {
    throw ApiError.unauthorized();
  }

  const reusableScan = scans.find(
    (scan) =>
      canReuseAnalysis(scan.createdAt, user.analysisPreferencesUpdatedAt) &&
      isAnalyzeBarcodeV2Response(scan.multiProfileResult) &&
      hasEnoughCachedProductInformation(scan.multiProfileResult, input.barcode),
  );

  if (!reusableScan || !isAnalyzeBarcodeV2Response(reusableScan.multiProfileResult)) {
    return null;
  }

  const reusedResult = withResolvedCanIHaveThisStatuses(reusableScan.multiProfileResult);

  return {
    barcode: input.barcode,
    result: {
      ...reusedResult,
      product: {
        ...reusedResult.product,
        englishName: reusedResult.product.englishName ?? null,
      },
    },
    reusedExistingAnalysis: true,
    scanId: reusableScan.id,
    ...(reusableScan.productId ? { productId: reusableScan.productId } : {}),
  };
}
