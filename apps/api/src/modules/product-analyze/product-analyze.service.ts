import { Injectable } from '@nestjs/common';
import type {
  AnalysisJobResponse,
  BarcodeLookupNotFoundResponse,
  BarcodeLookupSuccessResponse,
  NormalizedProduct,
  ProductComparisonResult,
} from '@acme/shared';
import { getAnalysisJob } from './services/analysis-jobs';
import { compareProductsForProfiles } from './services/comparison-ai';
import { isFoodProduct } from './services/is-food-product';
import {
  lookupBarcode,
  OpenFoodFactsLookupError,
} from './services/openfoodfacts-client';
import {
  extractTextFromPhoto,
  identifyProductByPhoto,
  PhotoIdentificationError,
} from './services/photo-product-identification';
import { getProfileInputs } from './services/profileInputs';
import { searchProductByBarcode } from './services/websearch-fallback';
import { processProductImage } from './lib/image-processing';
import { uploadProductImage } from './lib/storage';
import { createComparison } from './repositories/comparisonRepository';
import { isFavouriteByBarcode } from './repositories/favoriteRepository';
import { createProduct, findByBarcode } from './repositories/productRepository';
import { findProductIdByBarcode } from './repositories/scanRepository';
import { ApiError } from '../../shared/errors/api-error';
import type {
  AnalyzePhotoInput,
  PhotoOcrPayload,
} from './product-analyze.schemas';
import {
  buildSuccessResponse,
  createNotFoundResponse,
  resolveProduct,
  toComparisonProductPreview,
  toProductPreview,
} from './utils/analysis-response.utils';
import { attachPhotoImagePath } from './utils/attach-photo-image-path';

@Injectable()
export class ProductAnalyzeService {
  private async resolveNormalizedProductByBarcode(barcode: string): Promise<{
    product: NormalizedProduct | null;
    source: 'openfoodfacts' | 'websearch';
  }> {
    let product = await findByBarcode(barcode);
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

    return {
      product: await createProduct(product),
      source,
    };
  }

  async scanBarcode(
    barcode: string,
    userId?: string,
  ): Promise<BarcodeLookupSuccessResponse | BarcodeLookupNotFoundResponse> {
    const resolvedProduct =
      await this.resolveNormalizedProductByBarcode(barcode);

    if (!resolvedProduct.product) {
      return createNotFoundResponse(barcode, resolvedProduct.source);
    }

    const response = await buildSuccessResponse(
      barcode,
      resolvedProduct.source,
      resolvedProduct.product,
      userId,
    );

    if (userId) {
      const [isFavourite, productId] = await Promise.all([
        isFavouriteByBarcode(userId, response.barcode),
        findProductIdByBarcode(response.barcode),
      ]);

      return {
        ...response,
        isFavourite,
        productId: productId ?? undefined,
      };
    }

    const productId = await findProductIdByBarcode(response.barcode);

    return {
      ...response,
      productId: productId ?? undefined,
    };
  }

  getPersonalAnalysis(jobId: string): AnalysisJobResponse {
    const job = getAnalysisJob(jobId);

    if (!job) {
      throw ApiError.notFound('Analysis job not found');
    }

    return job;
  }

  async lookupProduct(
    barcode: string,
  ): Promise<{ success: true; product: ReturnType<typeof toProductPreview> }> {
    try {
      const resolvedProduct =
        await this.resolveNormalizedProductByBarcode(barcode);

      if (!resolvedProduct.product) {
        throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
      }

      const productId = await findProductIdByBarcode(
        resolvedProduct.product.code,
      );

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
    const [resolved1, resolved2] = await Promise.all([
      resolveProduct(barcode1),
      resolveProduct(barcode2),
    ]);

    if (!resolved1) {
      throw ApiError.notFound('First product not found', 'PRODUCT_NOT_FOUND');
    }

    if (!resolved2) {
      throw ApiError.notFound('Second product not found', 'PRODUCT_NOT_FOUND');
    }

    const profiles = await getProfileInputs(userId);
    const comparisonProfiles = await compareProductsForProfiles(
      resolved1.product,
      resolved2.product,
      profiles,
    );

    const result: ProductComparisonResult = {
      product1: toComparisonProductPreview(
        resolved1.product,
        resolved1.productId,
      ),
      product2: toComparisonProductPreview(
        resolved2.product,
        resolved2.productId,
      ),
      profiles: comparisonProfiles,
    };

    await createComparison({
      userId,
      product1Id: resolved1.productId ?? undefined,
      product2Id: resolved2.productId ?? undefined,
      barcode1,
      barcode2,
      comparisonResult: result,
    });

    return result;
  }

  async extractPhotoOcr(imageBase64: string): Promise<PhotoOcrPayload> {
    const ocr = await extractTextFromPhoto(imageBase64);

    if (!ocr) {
      throw ApiError.unprocessable(
        'Could not read text from photo',
        'OCR_FAILED',
      );
    }

    if (!ocr.isFoodProduct) {
      throw ApiError.unprocessable(
        'Product does not appear to be a food item',
        'NOT_FOOD',
      );
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
    const ocr = input.ocr ?? (await extractTextFromPhoto(input.imageBase64));

    if (!ocr) {
      throw ApiError.unprocessable(
        'Could not read text from photo',
        'OCR_FAILED',
      );
    }

    if (!ocr.isFoodProduct) {
      throw ApiError.unprocessable(
        'This product does not appear to be a food item',
        'NOT_FOOD',
      );
    }

    try {
      const identification = await identifyProductByPhoto(
        input.imageBase64,
        ocr,
      );

      if (!identification) {
        throw ApiError.notFound(
          'Could not identify product from photo',
          'PRODUCT_NOT_FOUND',
        );
      }

      if (!isFoodProduct(identification.product)) {
        throw ApiError.unprocessable(
          'This product does not appear to be a food item',
          'NOT_FOOD',
        );
      }

      let savedProduct = identification.product;
      let photoImagePath: string | null = null;

      if (identification.shouldUploadPhoto) {
        try {
          const rawBuffer = Buffer.from(input.imageBase64, 'base64');
          const processed = await processProductImage(rawBuffer);
          photoImagePath = await uploadProductImage(processed.buffer);
          savedProduct = await createProduct(
            attachPhotoImagePath(identification.product, photoImagePath),
          );
        } catch (error) {
          console.error(
            'Image processing/upload failed for a photo scan:',
            error,
          );
          throw ApiError.badGateway(
            'Failed to store product image',
            'IMAGE_UPLOAD_FAILED',
          );
        }
      }

      const response = await buildSuccessResponse(
        savedProduct.code,
        'photo',
        savedProduct,
        input.userId,
        'photo',
        photoImagePath ?? undefined,
      );

      const [isFavourite, productId] = await Promise.all([
        isFavouriteByBarcode(input.userId, response.barcode),
        findProductIdByBarcode(response.barcode),
      ]);

      return {
        ...response,
        isFavourite,
        productId: productId ?? undefined,
        photoImagePath: photoImagePath ?? undefined,
      };
    } catch (error) {
      if (error instanceof PhotoIdentificationError) {
        throw ApiError.unprocessable(error.message, error.code);
      }

      throw error;
    }
  }
}
