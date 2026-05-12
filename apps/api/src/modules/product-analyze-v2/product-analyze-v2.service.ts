import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { productAnalyzeV2Graph } from './langgraph/product-analyze-v2.graph.js';
import { analyzeNormalizedProductForUser } from './langgraph/nodes/analyze-barcode.node.js';
import { normalizeOpenFoodFactsProduct } from './utils/normalize-open-food-facts-product.util.js';
import { parsePhotoRequestV2 } from './utils/parse-photo-request-v2.util.js';
import {
  type CompareProductsV2UploadedFiles,
  compareProductsV2,
  type PersistProductAnalyzeV2ScanInput,
} from './services/compare-products-v2.service.js';
import { resolvePhotoProductV2Context } from './services/photo-product-identification.service.js';
import type {
  AnalyzeBarcodeV2Response,
  CompareProductsV2Response,
} from './types/analyze-product-v2.types.js';
import {
  type AnalyzePhotoV2Response,
  type UploadedPhotoFileV2,
} from './types/analyze-photo-v2.types.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { prisma } from '../../shared/lib/prisma.js';
import { findProductIdByBarcode } from '../product-domain/repositories/scanRepository.js';

const analyzeBarcodeRequestSchema = z.object({
  barcode: z.string().trim().min(1, 'Barcode is required'),
});

@Injectable()
export class ProductAnalyzeV2Service {
  private async getFavouriteState(
    userId: string,
    productId?: string,
  ): Promise<boolean | undefined> {
    if (!productId) {
      return undefined;
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      select: { id: true },
    });

    return Boolean(favorite);
  }

  private async buildResultMetadata(input: {
    userId: string;
    barcode: string;
    scanId?: string;
    productId?: string;
  }): Promise<Pick<AnalyzeBarcodeV2Response, 'scanId' | 'productId' | 'isFavourite'>> {
    const resolvedProductId =
      input.productId ?? (await findProductIdByBarcode(input.barcode)) ?? undefined;
    const isFavourite = await this.getFavouriteState(input.userId, resolvedProductId);

    return {
      ...(input.scanId ? { scanId: input.scanId } : {}),
      ...(resolvedProductId ? { productId: resolvedProductId } : {}),
      ...(isFavourite !== undefined ? { isFavourite } : {}),
    };
  }

  private async persistScanResult(input: PersistProductAnalyzeV2ScanInput): Promise<string> {
    const productId = input.productId ?? (await findProductIdByBarcode(input.barcode)) ?? undefined;
    const mainProfile =
      input.result.profiles.find((profile) => profile.type === 'user') ?? input.result.profiles[0];

    const scan = await prisma.scan.create({
      data: {
        userId: input.userId,
        type: 'product',
        productId: productId ?? null,
        barcode: input.barcode,
        source: input.source,
        overallScore: mainProfile?.analysis.overall.score ?? null,
        overallRating: mainProfile?.analysis.overall.rating ?? null,
        personalAnalysisStatus: 'completed',
        personalAnalysisJobId: randomUUID(),
        evaluation: Prisma.JsonNull,
        personalResult: input.result as unknown as Prisma.InputJsonValue,
        multiProfileResult: input.result as unknown as Prisma.InputJsonValue,
      },
    });

    return scan.id;
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

    const scanId = finalState.analyzedProduct?.reusedExistingAnalysis
      ? finalState.analyzedProduct.scanId
      : await this.persistScanResult({
          userId,
          barcode,
          source: 'barcode',
          result: finalState.result,
          productId: finalState.analyzedProduct?.productId,
        });

    const metadata = await this.buildResultMetadata({
      userId,
      barcode,
      scanId,
      productId: finalState.analyzedProduct?.productId,
    });

    return {
      ...finalState.result,
      ...metadata,
    };
  }

  async compareProducts(
    body: unknown,
    userId: string,
    files?: CompareProductsV2UploadedFiles,
  ): Promise<CompareProductsV2Response> {
    return compareProductsV2({
      body,
      files,
      userId,
      persistScanResult: (input) => this.persistScanResult(input),
    });
  }

  async analyzePhoto(
    body: unknown,
    userId: string,
    file?: UploadedPhotoFileV2,
  ): Promise<AnalyzePhotoV2Response> {
    const request = parsePhotoRequestV2(body, file);
    console.log(`[ProductAnalyzeV2Service] analyzePhoto — userId=${userId}`);

    const resolvedContext = await resolvePhotoProductV2Context({
      imageBase64: request.imageBase64,
      userId,
      ocr: request.ocr,
    });
    const product = normalizeOpenFoodFactsProduct(
      resolvedContext.product.code,
      resolvedContext.product,
    );
    const result = await analyzeNormalizedProductForUser({
      product,
      userId,
      logContext: `photo code=${resolvedContext.product.code}`,
    });

    const scanId = await this.persistScanResult({
      userId,
      barcode: resolvedContext.product.code,
      source: 'photo',
      result,
      productId: resolvedContext.productId,
    });

    const metadata = await this.buildResultMetadata({
      userId,
      barcode: resolvedContext.product.code,
      scanId,
      productId: resolvedContext.productId,
    });

    return {
      ...result,
      barcode: resolvedContext.product.code,
      ...metadata,
    };
  }
}
