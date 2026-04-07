import { Injectable } from '@nestjs/common';
import type {
  AnalysisJobResponse,
  BarcodeLookupResponse,
  CompareProductsRequest,
  ProductComparisonResult,
} from '@acme/shared';
import {
  barcodeLookupRequestSchema,
  compareProductsRequestSchema,
  productLookupRequestSchema,
} from './scanner.schemas';
import { ApiError } from '../../shared/errors/api-error';
import { ProductAnalyzeService } from '../product-analyze/product-analyze.service';
import { getValidationErrorMessage } from './utils/scanner-validation.util';

@Injectable()
export class ScannerService {
  constructor(private readonly productAnalyzeService: ProductAnalyzeService) {}

  async submitBarcodeScan(
    body: unknown,
    userId?: string,
  ): Promise<BarcodeLookupResponse> {
    const parsed = barcodeLookupRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw ApiError.badRequest(
        getValidationErrorMessage(parsed.error, 'Invalid barcode payload'),
      );
    }

    return this.productAnalyzeService.scanBarcode(parsed.data.barcode, userId);
  }

  getPersonalAnalysis(jobId: string): AnalysisJobResponse {
    return this.productAnalyzeService.getPersonalAnalysis(jobId);
  }

  async lookupProduct(body: unknown): Promise<{
    success: true;
    product: {
      productId: string;
      barcode: string;
      product_name: string | null;
      brands: string | null;
      image_url: string | null;
    };
  }> {
    const parsed = productLookupRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw ApiError.badRequest(
        getValidationErrorMessage(parsed.error, 'Invalid barcode payload'),
      );
    }

    return this.productAnalyzeService.lookupProduct(parsed.data.barcode);
  }

  async compareProducts(
    body: unknown,
    userId: string,
  ): Promise<ProductComparisonResult> {
    const parsed = compareProductsRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw ApiError.badRequest(
        getValidationErrorMessage(parsed.error, 'Invalid comparison payload'),
      );
    }

    const request: CompareProductsRequest = parsed.data;
    return this.productAnalyzeService.compareProducts(
      request.barcode1,
      request.barcode2,
      userId,
    );
  }
}
