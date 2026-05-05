import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { productAnalyzeV2Graph } from './langgraph/product-analyze-v2.graph.js';
import { analyzeNormalizedProductForUser } from './langgraph/nodes/analyze-barcode.node.js';
import { normalizeOpenFoodFactsProduct } from './utils/normalize-open-food-facts-product.util.js';
import { toRawPhotoBodyV2 } from './utils/photo-request.util.js';
import { resolvePhotoProductV2Context } from './services/photo-product-identification.service.js';
import {
  IMAGE_TOO_LARGE_ERROR,
  INVALID_OCR_FIELD_ERROR,
  INVALID_PHOTO_FILE_ERROR,
  MAX_PHOTO_BASE64_SIZE,
  MAX_PHOTO_UPLOAD_SIZE,
  PHOTO_FILE_REQUIRED_ERROR,
} from './constants/photo-analysis.constants.js';
import type { AnalyzeBarcodeV2Response } from './types/analyze-product-v2.types.js';
import {
  photoOcrPayloadV2Schema,
  type AnalyzePhotoV2Response,
  type UploadedPhotoFileV2,
} from './types/analyze-photo-v2.types.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { ProductAnalyzeService } from '../product-analyze/product-analyze.service.js';
import { prisma } from '../product-analyze/lib/prisma.js';

const analyzeBarcodeRequestSchema = z.object({
  barcode: z.string().trim().min(1, 'Barcode is required'),
});

interface ParsedPhotoRequestV2 {
  imageBase64: string;
  ocr?: z.infer<typeof photoOcrPayloadV2Schema>;
}

interface PersistScanResultInput {
  userId: string;
  barcode: string;
  source: 'barcode' | 'photo';
  result: AnalyzeBarcodeV2Response;
  productId?: string;
}

@Injectable()
export class ProductAnalyzeV2Service {
  constructor(private readonly productAnalyzeService: ProductAnalyzeService) {}

  private async persistScanResult(input: PersistScanResultInput): Promise<void> {
    const productId =
      input.productId ??
      (input.source === 'barcode'
        ? (await this.productAnalyzeService.resolveBarcodeScanContext(input.barcode)).productId
        : undefined);
    const mainProfile =
      input.result.profiles.find((profile) => profile.type === 'user') ?? input.result.profiles[0];

    await prisma.scan.create({
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
  }

  private parsePhotoRequest(body: unknown, file?: UploadedPhotoFileV2): ParsedPhotoRequestV2 {
    const request = toRawPhotoBodyV2(body);
    const imageBase64 = this.getImageBase64(request, file);
    const rawOcr = this.parseRawOcr(request.ocr);
    const parsedOcr = rawOcr == null ? null : photoOcrPayloadV2Schema.safeParse(rawOcr);

    if (parsedOcr && !parsedOcr.success) {
      throw ApiError.badRequest(INVALID_OCR_FIELD_ERROR);
    }

    return {
      imageBase64,
      ...(parsedOcr ? { ocr: parsedOcr.data } : {}),
    };
  }

  private getImageBase64(
    body: ReturnType<typeof toRawPhotoBodyV2>,
    file?: UploadedPhotoFileV2,
  ): string {
    if (file) {
      return this.fileToBase64(file);
    }

    if (typeof body.imageBase64 !== 'string' || body.imageBase64.length === 0) {
      throw ApiError.badRequest(PHOTO_FILE_REQUIRED_ERROR);
    }

    if (body.imageBase64.length > MAX_PHOTO_BASE64_SIZE) {
      throw ApiError.badRequest(IMAGE_TOO_LARGE_ERROR);
    }

    return body.imageBase64;
  }

  private fileToBase64(file: UploadedPhotoFileV2): string {
    if (!file.buffer || file.buffer.length === 0) {
      throw ApiError.badRequest(PHOTO_FILE_REQUIRED_ERROR);
    }

    if (file.size > MAX_PHOTO_UPLOAD_SIZE) {
      throw ApiError.badRequest(IMAGE_TOO_LARGE_ERROR);
    }

    if (!file.mimetype.startsWith('image/')) {
      throw ApiError.badRequest(INVALID_PHOTO_FILE_ERROR);
    }

    return file.buffer.toString('base64');
  }

  private parseRawOcr(value: unknown): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      throw ApiError.badRequest(INVALID_OCR_FIELD_ERROR);
    }
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

    await this.persistScanResult({
      userId,
      barcode,
      source: 'barcode',
      result: finalState.result,
    });

    return finalState.result;
  }

  async analyzePhoto(
    body: unknown,
    userId: string,
    file?: UploadedPhotoFileV2,
  ): Promise<AnalyzePhotoV2Response> {
    const request = this.parsePhotoRequest(body, file);
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

    await this.persistScanResult({
      userId,
      barcode: resolvedContext.product.code,
      source: 'photo',
      result,
      productId: resolvedContext.productId,
    });

    return result;
  }
}
