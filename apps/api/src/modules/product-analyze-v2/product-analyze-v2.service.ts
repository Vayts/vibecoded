import { Injectable, Logger } from '@nestjs/common';
import type { ProductLookupResponse } from '@acme/shared';
import { z } from 'zod';
import { productAnalyzeV2Graph } from './langgraph/product-analyze-v2.graph.js';
import { analyzeNormalizedProductForUser } from './langgraph/nodes/analyze-barcode.node.js';
import { normalizeOpenFoodFactsProduct } from './utils/normalize-open-food-facts-product.util.js';
import { parsePhotoRequestV2 } from './utils/parse-photo-request-v2.util.js';
import { resolveBarcodeProductContext } from './utils/resolve-barcode-product.util.js';
import {
  type CompareProductsV2UploadedFiles,
  compareProductsV2,
} from './services/compare-products-v2.service.js';
import {
  checkPackagePhotoCoverageV2,
  uploadPackagePhotosV2,
} from './services/package-photo-analysis-flow.service.js';
import { resolvePhotoProductV2Context } from './services/photo-product-identification.service.js';
import type {
  AnalyzeBarcodeV2Response,
  CompareProductsV2Response,
} from './types/analyze-product-v2.types.js';
import {
  type AnalyzePhotoV2Response,
  type PackagePhotoCoverageCode,
  type UploadedPhotoFileV2,
} from './types/analyze-photo-v2.types.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { formatLogContext } from './utils/product-analyze-v2-logger.util.js';
import {
  buildProductAnalyzeV2ResultMetadata,
  persistProductAnalyzeV2Scan,
} from './services/product-analysis-result-persistence.service.js';

const analyzeBarcodeRequestSchema = z.object({
  barcode: z.string().trim().min(1, 'Barcode is required'),
});

@Injectable()
export class ProductAnalyzeV2Service {
  private readonly logger = new Logger(ProductAnalyzeV2Service.name);

  async analyzeBarcode(body: unknown, userId: string): Promise<AnalyzeBarcodeV2Response> {
    const parsed = analyzeBarcodeRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw ApiError.badRequest(parsed.error.issues[0]?.message ?? 'Invalid request');
    }

    const { barcode } = parsed.data;
    this.logger.log(`analyzeBarcode ${formatLogContext({ barcode })}`);

    const finalState = await productAnalyzeV2Graph.invoke({ barcode, userId });

    if (!finalState.result) {
      this.logger.error(`Graph returned no result ${formatLogContext({ barcode })}`);
      throw ApiError.unprocessable('Analysis failed to produce a result', 'ANALYSIS_FAILED');
    }

    const scanId = finalState.analyzedProduct?.reusedExistingAnalysis
      ? finalState.analyzedProduct.scanId
      : await persistProductAnalyzeV2Scan({
          userId,
          barcode,
          source: 'barcode',
          result: finalState.result,
          productId: finalState.analyzedProduct?.productId,
        });

    const metadata = await buildProductAnalyzeV2ResultMetadata({
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

  async lookupBarcode(body: unknown, userId: string): Promise<ProductLookupResponse> {
    const parsed = analyzeBarcodeRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw ApiError.badRequest(parsed.error.issues[0]?.message ?? 'Invalid request');
    }

    const { barcode } = parsed.data;
    this.logger.log(
      `lookupBarcode ${formatLogContext({ barcode, authenticated: Boolean(userId) })}`,
    );

    const resolvedProduct = await resolveBarcodeProductContext({ barcode });

    return {
      success: true,
      product: {
        productId: resolvedProduct.productId ?? '',
        barcode,
        product_name: resolvedProduct.product.name,
        product_name_english: null,
        brands: resolvedProduct.product.brand,
        image_url: resolvedProduct.product.imageUrl,
        nutriscore_grade: null,
      },
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
      persistScanResult: persistProductAnalyzeV2Scan,
    });
  }

  async analyzePhoto(
    body: unknown,
    userId: string,
    file?: UploadedPhotoFileV2,
  ): Promise<AnalyzePhotoV2Response> {
    const request = parsePhotoRequestV2(body, file);
    this.logger.log('analyzePhoto');

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

    const scanId = await persistProductAnalyzeV2Scan({
      userId,
      barcode: resolvedContext.product.code,
      source: 'photo',
      result,
      productId: resolvedContext.productId,
    });

    const metadata = await buildProductAnalyzeV2ResultMetadata({
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

  async uploadPackagePhotos(
    body: unknown,
    userId: string,
    files: UploadedPhotoFileV2[] = [],
  ): Promise<AnalyzePhotoV2Response> {
    return uploadPackagePhotosV2({
      body,
      userId,
      files,
      persistScanResult: persistProductAnalyzeV2Scan,
      buildResultMetadata: buildProductAnalyzeV2ResultMetadata,
    });
  }

  async checkPackagePhotoCoverage(
    body: unknown,
    userId: string,
    file?: UploadedPhotoFileV2,
  ): Promise<PackagePhotoCoverageCode> {
    return checkPackagePhotoCoverageV2({ body, userId, file });
  }
}
