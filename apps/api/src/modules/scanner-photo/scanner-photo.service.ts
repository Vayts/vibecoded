import { Injectable } from '@nestjs/common';
import type { BarcodeLookupSuccessResponse } from '@acme/shared';
import { ApiError } from '../../shared/errors/api-error';
import { MAX_PHOTO_BASE64_SIZE } from '../product-analyze/product-analyze.constants';
import { photoOcrPayloadSchema } from '../product-analyze/product-analyze.schemas';
import { ScannerLangGraphService } from '../product-analyze/services/scanner-langgraph.service';
import {
  IMAGE_TOO_LARGE_ERROR,
  INVALID_OCR_FIELD_ERROR,
  INVALID_PHOTO_FILE_ERROR,
  PHOTO_FILE_REQUIRED_ERROR,
} from './scanner-photo.constants';
import type { PhotoOcrRequest, PhotoScanRequest, UploadedPhotoFile } from './scanner-photo.schemas';
import { toRawPhotoBody } from './utils/scanner-photo-request.util';

@Injectable()
export class ScannerPhotoService {
  constructor(private readonly scannerLangGraphService: ScannerLangGraphService) {}

  async extractPhotoOcr(body: unknown, file?: UploadedPhotoFile) {
    const request = this.parsePhotoOcrRequest(body, file);
    return this.scannerLangGraphService.extractPhotoOcr(request.imageBase64);
  }

  async submitPhotoScan(
    body: unknown,
    userId: string,
    file?: UploadedPhotoFile,
  ): Promise<BarcodeLookupSuccessResponse & { photoImagePath?: string }> {
    const request = this.parsePhotoScanRequest(body, file);

    return this.scannerLangGraphService.analyzePhoto({
      imageBase64: request.imageBase64,
      userId,
      ocr: request.ocr ?? undefined,
    });
  }

  private parsePhotoOcrRequest(body: unknown, file?: UploadedPhotoFile): PhotoOcrRequest {
    return {
      imageBase64: this.getImageBase64(body, file),
    };
  }

  private parsePhotoScanRequest(body: unknown, file?: UploadedPhotoFile): PhotoScanRequest {
    const request = toRawPhotoBody(body);

    const imageBase64 = this.getImageBase64(request, file);

    const rawOcr = this.parseRawOcr(request.ocr);

    const parsedOcr = rawOcr == null ? null : photoOcrPayloadSchema.safeParse(rawOcr);
    if (parsedOcr && !parsedOcr.success) {
      throw ApiError.badRequest(INVALID_OCR_FIELD_ERROR);
    }

    return {
      imageBase64,
      ...(parsedOcr ? { ocr: parsedOcr.data } : {}),
    };
  }

  private getImageBase64(body: unknown, file?: UploadedPhotoFile): string {
    if (file) {
      return this.fileToBase64(file);
    }

    const request = toRawPhotoBody(body);

    if (typeof request.imageBase64 !== 'string' || request.imageBase64.length === 0) {
      throw ApiError.badRequest(PHOTO_FILE_REQUIRED_ERROR);
    }

    if (request.imageBase64.length > MAX_PHOTO_BASE64_SIZE) {
      throw ApiError.badRequest(IMAGE_TOO_LARGE_ERROR);
    }

    return request.imageBase64;
  }

  private fileToBase64(file: UploadedPhotoFile): string {
    if (!file.buffer || file.buffer.length === 0) {
      throw ApiError.badRequest(PHOTO_FILE_REQUIRED_ERROR);
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
}
