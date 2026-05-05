import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { productAnalyzeV2CompareGraph } from '../langgraph/product-analyze-v2.graph.js';
import type {
  AnalyzeBarcodeV2Response,
  CompareProductV2Result,
  CompareProductsV2Response,
} from '../types/analyze-product-v2.types.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { prisma } from '../../product-analyze/lib/prisma.js';
import { buildCompareProfileResults } from '../utils/build-compare-profile-results.util.js';

const compareProductsRequestSchema = z
  .object({
    barcodeA: z.string().trim().min(1, 'First barcode is required'),
    barcodeB: z.string().trim().min(1, 'Second barcode is required'),
  })
  .strict();

export interface PersistProductAnalyzeV2ScanInput {
  userId: string;
  barcode: string;
  source: 'barcode' | 'photo';
  result: AnalyzeBarcodeV2Response;
  productId?: string;
}

export type PersistProductAnalyzeV2Scan = (
  input: PersistProductAnalyzeV2ScanInput,
) => Promise<string>;

const createComparisonRecord = async (input: {
  barcodeA: string;
  barcodeB: string;
  product1Id?: string;
  product2Id?: string;
  userId: string;
}) => {
  return prisma.comparison.create({
    data: {
      userId: input.userId,
      product1Id: input.product1Id ?? null,
      product2Id: input.product2Id ?? null,
      barcode1: input.barcodeA,
      barcode2: input.barcodeB,
      comparisonResult: {} as Prisma.InputJsonValue,
    },
  });
};

const updateComparisonRecord = async (
  comparisonId: string,
  comparisonResult: CompareProductsV2Response,
) => {
  await prisma.comparison.update({
    where: { id: comparisonId },
    data: {
      comparisonResult: comparisonResult as unknown as Prisma.InputJsonValue,
    },
  });
};

export async function compareProductsV2(input: {
  body: unknown;
  userId: string;
  persistScanResult: PersistProductAnalyzeV2Scan;
}): Promise<CompareProductsV2Response> {
  const parsed = compareProductsRequestSchema.safeParse(input.body);
  if (!parsed.success) {
    throw ApiError.badRequest(parsed.error.issues[0]?.message ?? 'Invalid request');
  }

  const { barcodeA, barcodeB } = parsed.data;
  if (barcodeA === barcodeB) {
    throw ApiError.badRequest('Products for comparison must be different');
  }

  const finalState = await productAnalyzeV2CompareGraph.invoke({
    barcodeA,
    barcodeB,
    userId: input.userId,
  });

  if (!finalState.products || finalState.products.length !== 2) {
    throw ApiError.unprocessable('Comparison failed to produce a result', 'ANALYSIS_FAILED');
  }

  const products = (await Promise.all(
    finalState.products.map(async (analyzedProduct) => {
      const scanId = analyzedProduct.reusedExistingAnalysis
        ? analyzedProduct.scanId
        : await input.persistScanResult({
            userId: input.userId,
            barcode: analyzedProduct.barcode,
            source: 'barcode',
            result: analyzedProduct.result,
            productId: analyzedProduct.productId,
          });

      return {
        barcode: analyzedProduct.barcode,
        ...analyzedProduct.result,
        ...(analyzedProduct.productId ? { productId: analyzedProduct.productId } : {}),
        ...(scanId ? { scanId } : {}),
      };
    }),
  )) as [CompareProductV2Result, CompareProductV2Result];

  const comparison = await createComparisonRecord({
    userId: input.userId,
    barcodeA,
    barcodeB,
    product1Id: products[0].productId,
    product2Id: products[1].productId,
  });

  const response: CompareProductsV2Response = {
    comparisonId: comparison.id,
    products,
    profileResults: buildCompareProfileResults(products),
  };

  await updateComparisonRecord(comparison.id, response);

  return response;
}
