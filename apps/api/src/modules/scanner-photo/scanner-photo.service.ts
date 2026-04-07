import { Injectable } from '@nestjs/common';
import type { BarcodeLookupSuccessResponse } from '@acme/shared';
import { ApiError } from '../../shared/errors/api-error';
import { MAX_PHOTO_BASE64_SIZE } from '../product-analyze/product-analyze.constants';
import { photoOcrPayloadSchema } from '../product-analyze/product-analyze.schemas';
import { ProductAnalyzeService } from '../product-analyze/product-analyze.service';
import {
  IMAGE_BASE64_REQUIRED_ERROR,
  IMAGE_TOO_LARGE_ERROR,
  INVALID_OCR_FIELD_ERROR,
} from './scanner-photo.constants';
import type {
  PhotoOcrRequest,
  PhotoScanRequest,
} from './scanner-photo.schemas';
import { toRawPhotoBody } from './utils/scanner-photo-request.util';

@Injectable()
export class ScannerPhotoService {
  constructor(private readonly productAnalyzeService: ProductAnalyzeService) {}

  async extractPhotoOcr(body: unknown) {
    const request = this.parsePhotoOcrRequest(body);
    return this.productAnalyzeService.extractPhotoOcr(request.imageBase64);
  }

  async submitPhotoScan(
    body: unknown,
    userId: string,
  ): Promise<BarcodeLookupSuccessResponse & { photoImagePath?: string }> {
    const request = this.parsePhotoScanRequest(body);

    return this.productAnalyzeService.analyzePhoto({
      imageBase64: request.imageBase64,
      userId,
      ocr: request.ocr ?? undefined,
    });
  }

  private parsePhotoOcrRequest(body: unknown): PhotoOcrRequest {
    const request = toRawPhotoBody(body);

    if (
      typeof request.imageBase64 !== 'string' ||
      request.imageBase64.length === 0
    ) {
      throw ApiError.badRequest(IMAGE_BASE64_REQUIRED_ERROR);
    }

    if (request.imageBase64.length > MAX_PHOTO_BASE64_SIZE) {
      throw ApiError.badRequest(IMAGE_TOO_LARGE_ERROR);
    }

    return {
      imageBase64: request.imageBase64,
    };
  }

  private parsePhotoScanRequest(body: unknown): PhotoScanRequest {
    const request = toRawPhotoBody(body);

    if (
      typeof request.imageBase64 !== 'string' ||
      request.imageBase64.length === 0
    ) {
      throw ApiError.badRequest(IMAGE_BASE64_REQUIRED_ERROR);
    }

    if (request.imageBase64.length > MAX_PHOTO_BASE64_SIZE) {
      throw ApiError.badRequest(IMAGE_TOO_LARGE_ERROR);
    }

    const parsedOcr =
      request.ocr == null ? null : photoOcrPayloadSchema.safeParse(request.ocr);
    if (parsedOcr && !parsedOcr.success) {
      throw ApiError.badRequest(INVALID_OCR_FIELD_ERROR);
    }

    return {
      imageBase64: request.imageBase64,
      ...(parsedOcr ? { ocr: parsedOcr.data } : {}),
    };
  }
}
