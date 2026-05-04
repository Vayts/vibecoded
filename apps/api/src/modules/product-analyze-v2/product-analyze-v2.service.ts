import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { productAnalyzeV2Graph } from './langgraph/product-analyze-v2.graph.js';
import type { AnalyzeBarcodeV2Response } from './types/analyze-product-v2.types.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { ProductAnalyzeService } from '../product-analyze/product-analyze.service.js';
import { prisma } from '../product-analyze/lib/prisma.js';

const analyzeBarcodeRequestSchema = z.object({
  barcode: z.string().trim().min(1, 'Barcode is required'),
});

@Injectable()
export class ProductAnalyzeV2Service {
  constructor(private readonly productAnalyzeService: ProductAnalyzeService) {}

  private async persistScanResult(
    userId: string,
    barcode: string,
    result: AnalyzeBarcodeV2Response,
  ): Promise<void> {
    const resolvedContext = await this.productAnalyzeService.resolveBarcodeScanContext(barcode);
    const mainProfile =
      result.profiles.find((profile) => profile.type === 'user') ?? result.profiles[0];

    await prisma.scan.create({
      data: {
        userId,
        type: 'product',
        productId: resolvedContext.productId ?? null,
        barcode,
        source: 'barcode',
        overallScore: mainProfile?.analysis.overall.score ?? null,
        overallRating: mainProfile?.analysis.overall.rating ?? null,
        personalAnalysisStatus: 'completed',
        personalAnalysisJobId: randomUUID(),
        evaluation: Prisma.JsonNull,
        personalResult: result as unknown as Prisma.InputJsonValue,
        multiProfileResult: result as unknown as Prisma.InputJsonValue,
      },
    });
  }

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

    await this.persistScanResult(userId, barcode, finalState.result);

    return finalState.result;
  }
}
