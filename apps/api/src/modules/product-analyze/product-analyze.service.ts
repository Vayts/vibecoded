/* eslint-disable max-lines */

import { Injectable } from '@nestjs/common';
import type {
  AnalysisJobResponse,
  BarcodeLookupNotFoundResponse,
  BarcodeLookupSuccessResponse,
  DietCompatibility,
  NormalizedProduct,
  ProductComparisonResult,
  ScannerLookupSource,
} from '@acme/shared';
import { compareProductsForProfiles, SameProductComparisonError } from './services/comparison-ai';
import { isFoodProduct } from './services/is-food-product';
import { lookupBarcode, OpenFoodFactsLookupError } from './services/openfoodfacts-client';
import {
  extractTextFromPhoto,
  identifyProductByPhoto,
  PhotoIdentificationError,
} from './services/photo-product-identification';
import { hasSameCanonicalProductIdentity } from './services/product-canonical-text';
import { getProfileInputs } from './services/profileInputs';
import { searchProductByBarcode } from './services/websearch-fallback';
import { processProductImage } from './lib/image-processing';
import { uploadProductImage } from './lib/storage';
import { createComparison } from './repositories/comparisonRepository';
import { isFavouriteByBarcode } from './repositories/favoriteRepository';
import {
  createProduct,
  findByBarcode,
  findProductClassificationCache,
} from './repositories/productRepository';
import { findProductIdByBarcode } from './repositories/scanRepository';
import { AnalysisOrchestratorService } from './services/analysis-orchestrator.service';
import { ApiError } from '../../shared/errors/api-error';
import type { AnalyzePhotoInput, PhotoOcrPayload } from './product-analyze.schemas';
import {
  createNotFoundResponse,
  resolveProduct,
  toBarcodeLookupProduct,
  toComparisonProductPreview,
  toProductPreview,
} from './utils/analysis-response.utils';
import { attachPhotoImagePath } from './utils/attach-photo-image-path';

const SAME_PRODUCT_ERROR_CODE = 'SAME_PRODUCT';
const SAME_PRODUCT_ERROR_MESSAGE =
  'You scanned the same product twice. Scan a different product to compare.';

interface ScannerProductMetadata {
  dietCompatibility?: DietCompatibility;
  isFavourite?: boolean;
}

interface ResolvedBarcodeScanContext {
  product: NormalizedProduct | null;
  productId?: string;
  source: ScannerLookupSource;
}

interface ResolvedPhotoScanContext {
  product: NormalizedProduct;
  productId?: string;
}

@Injectable()
export class ProductAnalyzeService {
  constructor(private readonly analysisOrchestrator: AnalysisOrchestratorService) {}

  private syncPhotoImageInBackground(imageBase64: string, product: NormalizedProduct): void {
    void (async () => {
      const startedAt = Date.now();
      const rawBuffer = Buffer.from(imageBase64, 'base64');
      const processed = await processProductImage(rawBuffer);
      const photoImagePath = await uploadProductImage(processed.buffer);

      await createProduct(attachPhotoImagePath(product, photoImagePath));

      console.log(
        `[photo-scan] deferred photo image sync done code=${product.code} elapsed=${Date.now() - startedAt}ms`,
      );
    })().catch((error) => {
      console.error('Deferred image processing/upload failed for a photo scan:', error);
    });
  }

  private async resolveNormalizedProductByBarcode(barcode: string): Promise<{
    product: NormalizedProduct | null;
    source: 'openfoodfacts' | 'websearch';
  }> {
    let product = await findByBarcode(barcode);
    const wasExistingInDb = Boolean(product);
    let source: 'openfoodfacts' | 'websearch' = 'openfoodfacts';

    if (!product) {
      try {
        product = await lookupBarcode(barcode);
      } catch (error) {
        if (!(error instanceof OpenFoodFactsLookupError)) {
          throw error;
        }

        console.warn(
          `[scanner] OFF lookup failed (${error.code}) for ${barcode}: ${error.message}`,
        );
      }
    }

    if (!product) {
      product = await searchProductByBarcode(barcode);
      if (product) {
        source = 'websearch';
      }
    }

    if (!product || !isFoodProduct(product)) {
      return {
        product: null,
        source,
      };
    }

    if (wasExistingInDb) {
      console.log(`[scanner] Reusing existing DB product for barcode=${barcode}; skipping upsert`);

      return {
        product,
        source,
      };
    }

    return {
      product: await createProduct(product),
      source,
    };
  }

  async resolveBarcodeScanContext(barcode: string): Promise<ResolvedBarcodeScanContext> {
    const resolvedProduct = await this.resolveNormalizedProductByBarcode(barcode);

    if (!resolvedProduct.product) {
      return {
        product: null,
        source: resolvedProduct.source,
      };
    }

    const productId = await findProductIdByBarcode(resolvedProduct.product.code);

    return {
      product: resolvedProduct.product,
      productId: productId ?? undefined,
      source: resolvedProduct.source,
    };
  }

  async startScannerAnalysis(input: {
    product: NormalizedProduct;
    productId?: string;
    userId?: string;
    scanSource: 'barcode' | 'photo';
  }): Promise<{ analysis: AnalysisJobResponse; scanId?: string }> {
    return this.analysisOrchestrator.startAnalysis(input);
  }

  async loadScannerProductMetadata(input: {
    barcode: string;
    productId?: string;
    userId?: string;
  }): Promise<ScannerProductMetadata> {
    const [classification, isFavourite] = await Promise.all([
      findProductClassificationCache({
        productId: input.productId,
        barcode: input.barcode,
      }),
      input.userId ? isFavouriteByBarcode(input.userId, input.barcode) : Promise.resolve(undefined),
    ]);

    return {
      dietCompatibility: classification?.dietCompatibility,
      isFavourite,
    };
  }

  buildScannerSuccessResponse(input: {
    analysis: AnalysisJobResponse;
    barcode: string;
    isFavourite?: boolean;
    product: NormalizedProduct;
    productId?: string;
    scanId?: string;
    source: ScannerLookupSource;
    dietCompatibility?: DietCompatibility;
  }): BarcodeLookupSuccessResponse {
    return {
      success: true,
      barcode: input.barcode,
      source: input.source,
      product: toBarcodeLookupProduct(input.product, input.dietCompatibility),
      personalAnalysis: input.analysis,
      scanId: input.scanId,
      productId: input.productId,
      ...(typeof input.isFavourite === 'boolean' ? { isFavourite: input.isFavourite } : {}),
    };
  }

  createBarcodeNotFoundResponse(
    barcode: string,
    source: ScannerLookupSource,
  ): BarcodeLookupNotFoundResponse {
    return createNotFoundResponse(barcode, source);
  }

  async resolvePhotoScanContext(input: AnalyzePhotoInput): Promise<ResolvedPhotoScanContext> {
    const ocr = input.ocr ?? (await extractTextFromPhoto(input.imageBase64));

    if (!ocr) {
      throw ApiError.unprocessable('Could not read text from photo', 'OCR_FAILED');
    }

    if (!ocr.isFoodProduct) {
      throw ApiError.unprocessable('This product does not appear to be a food item', 'NOT_FOOD');
    }

    const identification = await identifyProductByPhoto(input.imageBase64, ocr);

    if (!identification) {
      throw ApiError.notFound('Could not identify product from photo', 'PRODUCT_NOT_FOUND');
    }

    if (!isFoodProduct(identification.product)) {
      throw ApiError.unprocessable('This product does not appear to be a food item', 'NOT_FOOD');
    }

    let savedProduct = identification.product;
    let productId = await findProductIdByBarcode(savedProduct.code);

    if (!productId) {
      savedProduct = await createProduct(savedProduct);
      productId = await findProductIdByBarcode(savedProduct.code);
    }

    if (identification.shouldUploadPhoto) {
      this.syncPhotoImageInBackground(input.imageBase64, savedProduct);
    }

    return {
      product: savedProduct,
      productId: productId ?? undefined,
    };
  }

  async scanBarcode(
    barcode: string,
    userId?: string,
  ): Promise<BarcodeLookupSuccessResponse | BarcodeLookupNotFoundResponse> {
    const resolvedContext = await this.resolveBarcodeScanContext(barcode);

    if (!resolvedContext.product) {
      return this.createBarcodeNotFoundResponse(barcode, resolvedContext.source);
    }

    const [analysisState, metadata] = await Promise.all([
      this.startScannerAnalysis({
        product: resolvedContext.product,
        productId: resolvedContext.productId,
        userId,
        scanSource: 'barcode',
      }),
      this.loadScannerProductMetadata({
        barcode: resolvedContext.product.code,
        productId: resolvedContext.productId,
        userId,
      }),
    ]);

    return this.buildScannerSuccessResponse({
      analysis: analysisState.analysis,
      barcode,
      product: resolvedContext.product,
      productId: resolvedContext.productId,
      scanId: analysisState.scanId,
      source: resolvedContext.source,
      dietCompatibility:
        metadata.dietCompatibility ?? analysisState.analysis.result?.productFacts.dietCompatibility,
      isFavourite: metadata.isFavourite,
    });
  }

  async lookupProduct(
    barcode: string,
  ): Promise<{ success: true; product: ReturnType<typeof toProductPreview> }> {
    try {
      const resolvedProduct = await this.resolveNormalizedProductByBarcode(barcode);

      if (!resolvedProduct.product) {
        throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
      }

      const productId = await findProductIdByBarcode(resolvedProduct.product.code);

      if (!productId) {
        throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
      }

      return {
        success: true,
        product: toProductPreview(resolvedProduct.product, productId),
      };
    } catch (error) {
      if (error instanceof OpenFoodFactsLookupError) {
        throw ApiError.badGateway(error.message, error.code);
      }

      throw error;
    }
  }

  async compareProducts(
    barcode1: string,
    barcode2: string,
    userId: string,
  ): Promise<ProductComparisonResult> {
    const normalizedBarcode1 = barcode1.trim();
    const normalizedBarcode2 = barcode2.trim();
    const [resolved1, resolved2] = await Promise.all([
      resolveProduct(normalizedBarcode1),
      resolveProduct(normalizedBarcode2),
    ]);

    if (!resolved1) {
      throw ApiError.notFound('First product not found', 'PRODUCT_NOT_FOUND');
    }

    if (!resolved2) {
      throw ApiError.notFound('Second product not found', 'PRODUCT_NOT_FOUND');
    }

    const isSameProduct =
      normalizedBarcode1 === normalizedBarcode2 ||
      resolved1.product.code === resolved2.product.code ||
      hasSameCanonicalProductIdentity(
        {
          productName: resolved1.product.product_name,
          brand: resolved1.product.brands,
          quantity: resolved1.product.quantity,
        },
        {
          productName: resolved2.product.product_name,
          brand: resolved2.product.brands,
          quantity: resolved2.product.quantity,
        },
      ) ||
      (resolved1.productId != null &&
        resolved2.productId != null &&
        resolved1.productId === resolved2.productId);

    if (isSameProduct) {
      throw ApiError.unprocessable(SAME_PRODUCT_ERROR_MESSAGE, SAME_PRODUCT_ERROR_CODE);
    }

    const profiles = await getProfileInputs(userId);
    let comparisonProfiles: ProductComparisonResult['profiles'];

    try {
      comparisonProfiles = await compareProductsForProfiles(
        resolved1.product,
        resolved2.product,
        profiles,
      );
    } catch (error) {
      if (error instanceof SameProductComparisonError) {
        throw ApiError.unprocessable(error.message, SAME_PRODUCT_ERROR_CODE);
      }

      throw error;
    }

    const result: ProductComparisonResult = {
      product1: toComparisonProductPreview(resolved1.product, resolved1.productId),
      product2: toComparisonProductPreview(resolved2.product, resolved2.productId),
      profiles: comparisonProfiles,
    };

    const comparison = await createComparison({
      userId,
      product1Id: resolved1.productId ?? undefined,
      product2Id: resolved2.productId ?? undefined,
      barcode1: normalizedBarcode1,
      barcode2: normalizedBarcode2,
      comparisonResult: result,
    });

    return {
      ...result,
      comparisonId: comparison.id,
    };
  }

  async extractPhotoOcr(imageBase64: string): Promise<PhotoOcrPayload> {
    const ocr = await extractTextFromPhoto(imageBase64);

    if (!ocr) {
      throw ApiError.unprocessable('Could not read text from photo', 'OCR_FAILED');
    }

    if (!ocr.isFoodProduct) {
      throw ApiError.unprocessable('Product does not appear to be a food item', 'NOT_FOOD');
    }

    return {
      allText: ocr.allText,
      productName: ocr.productName,
      brand: ocr.brand,
      isFoodProduct: ocr.isFoodProduct,
    };
  }

  async analyzePhoto(
    input: AnalyzePhotoInput,
  ): Promise<BarcodeLookupSuccessResponse & { photoImagePath?: string }> {
    try {
      const resolvedContext = await this.resolvePhotoScanContext(input);
      const [analysisState, metadata] = await Promise.all([
        this.startScannerAnalysis({
          product: resolvedContext.product,
          productId: resolvedContext.productId,
          userId: input.userId,
          scanSource: 'photo',
        }),
        this.loadScannerProductMetadata({
          barcode: resolvedContext.product.code,
          productId: resolvedContext.productId,
          userId: input.userId,
        }),
      ]);

      return this.buildScannerSuccessResponse({
        analysis: analysisState.analysis,
        barcode: resolvedContext.product.code,
        product: resolvedContext.product,
        productId: resolvedContext.productId,
        scanId: analysisState.scanId,
        source: 'photo',
        dietCompatibility:
          metadata.dietCompatibility ??
          analysisState.analysis.result?.productFacts.dietCompatibility,
        isFavourite: metadata.isFavourite,
      });
    } catch (error) {
      if (error instanceof PhotoIdentificationError) {
        throw ApiError.unprocessable(error.message, error.code);
      }

      throw error;
    }
  }
}
