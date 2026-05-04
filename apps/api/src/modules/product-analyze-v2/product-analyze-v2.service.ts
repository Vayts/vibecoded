import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { productAnalyzeV2Graph } from './langgraph/product-analyze-v2.graph.js';
import type { AnalyzeBarcodeV2Response } from './types/analyze-product-v2.types.js';
import { ApiError } from '../../shared/errors/api-error.js';

const analyzeBarcodeRequestSchema = z.object({
  barcode: z.string().trim().min(1, 'Barcode is required'),
});

@Injectable()
export class ProductAnalyzeV2Service {
  async analyzeBarcode(body: unknown, userId: string): Promise<AnalyzeBarcodeV2Response> {
    const parsed = analyzeBarcodeRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw ApiError.badRequest(parsed.error.issues[0]?.message ?? 'Invalid request');
    }

    const { barcode } = parsed.data;
    console.log(`[ProductAnalyzeV2Service] analyzeBarcode — barcode=${barcode} userId=${userId}`);

    const finalState = await productAnalyzeV2Graph.invoke({ barcode, userId });

    if (!finalState.result) {
      console.error(`[ProductAnalyzeV2Service] Graph returned no result — barcode=${barcode}`);
      throw ApiError.unprocessable('Analysis failed to produce a result', 'ANALYSIS_FAILED');
    }

    return finalState.result;
  }
}
