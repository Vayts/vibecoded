import { z } from 'zod';
import { productAnalyzeV2CompareGraph } from '../langgraph/product-analyze-v2.graph.js';
import type {
  AnalyzeBarcodeV2Response,
  CompareProductsV2Response,
} from '../types/analyze-product-v2.types.js';
import { ApiError } from '../../../shared/errors/api-error.js';

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

  const products = await Promise.all(
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
  );

  return { products };
}
