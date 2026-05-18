import { z } from 'zod';
import { Logger } from '@nestjs/common';
import { ApiError } from '../../../shared/errors/api-error.js';
import { findProductIdByBarcode } from '../../product-domain/repositories/scanRepository.js';
import {
  createProduct,
  findByBarcode,
} from '../../product-domain/repositories/productRepository.js';
import { analyzeNormalizedProductForUser } from '../langgraph/nodes/analyze-barcode.node.js';
import type { AnalyzeBarcodeV2Response } from '../types/analyze-product-v2.types.js';
import type {
  PackagePhotosCoverageResponse,
  PackagePhotosV2Response,
  UploadedPhotoFileV2,
} from '../types/analyze-photo-v2.types.js';
import { normalizeOpenFoodFactsProduct } from '../utils/normalize-open-food-facts-product.util.js';
import {
  mergePhotoProduct,
  shouldRefreshPhotoProduct,
} from '../utils/photo-product-refresh.util.js';
import { formatLogContext } from '../utils/product-analyze-v2-logger.util.js';
import {
  buildMissingPackagePhotoMessage,
  extractAndMergePackagePhotos,
  getPackagePhotoCoverageCode,
  getMissingPackagePhotoFields,
} from './package-photo-extraction-merge.service.js';
import { attachFrontPackagePhotoImage } from './package-photo-image.service.js';
import { createPackagePhotoNormalizedProduct } from './package-photo-product-normalization.service.js';
import type { PersistProductAnalyzeV2Scan } from './compare-products-v2.service.js';

const logger = new Logger('ProductAnalyzeV2PackagePhotos');

const PACKAGE_PHOTO_PRODUCT_FLAGS = {
  isAiChecked: false,
  isVerified: false,
} as const;

const packagePhotosRequestSchema = z.object({
  barcode: z.string().trim().min(1, 'Barcode is required'),
  metadata: z.unknown().optional(),
});

type BuildResultMetadata = (input: {
  userId: string;
  barcode: string;
  scanId?: string;
  productId?: string;
}) => Promise<Pick<AnalyzeBarcodeV2Response, 'scanId' | 'productId' | 'isFavourite'>>;

interface PackagePhotoFlowInput {
  body: unknown;
  userId: string;
  files: UploadedPhotoFileV2[];
  persistScanResult: PersistProductAnalyzeV2Scan;
  buildResultMetadata: BuildResultMetadata;
}

const logUploadedFiles = (files: UploadedPhotoFileV2[]): void => {
  files.forEach((file, index) => {
    logger.log(`uploadPackagePhotos file[${index}] — size=${file.size} mimetype=${file.mimetype}`);
  });
};

interface PackagePhotoCoverageInput {
  body: unknown;
  userId: string;
  files: UploadedPhotoFileV2[];
}

export async function checkPackagePhotosCoverageV2(
  input: PackagePhotoCoverageInput,
): Promise<PackagePhotosCoverageResponse> {
  const parsed = packagePhotosRequestSchema.safeParse(input.body);
  if (!parsed.success) {
    throw ApiError.badRequest(parsed.error.issues[0]?.message ?? 'Invalid request');
  }

  const { barcode, metadata } = parsed.data;
  logger.log(
    `checkPackagePhotosCoverage ${formatLogContext({
      barcode,
      photoCount: input.files.length,
      hasMetadata: metadata !== undefined,
    })}`,
  );
  logUploadedFiles(input.files);

  const extraction = await extractAndMergePackagePhotos({
    files: input.files,
    metadata,
    userId: input.userId,
  });
  const missingFields = getMissingPackagePhotoFields(extraction);
  const coverage = getPackagePhotoCoverageCode(extraction);

  if (missingFields.length > 0) {
    return {
      status: 'needs_more_photos',
      coverage,
      missingFields,
      message: buildMissingPackagePhotoMessage(missingFields),
    };
  }

  return {
    status: 'complete',
    coverage,
    missingFields,
  };
}

export async function uploadPackagePhotosV2(
  input: PackagePhotoFlowInput,
): Promise<PackagePhotosV2Response> {
  const parsed = packagePhotosRequestSchema.safeParse(input.body);
  if (!parsed.success) {
    throw ApiError.badRequest(parsed.error.issues[0]?.message ?? 'Invalid request');
  }

  const { barcode, metadata } = parsed.data;
  logger.log(
    `uploadPackagePhotos ${formatLogContext({
      barcode,
      photoCount: input.files.length,
      hasMetadata: metadata !== undefined,
    })}`,
  );
  logUploadedFiles(input.files);

  const extraction = await extractAndMergePackagePhotos({
    files: input.files,
    metadata,
    userId: input.userId,
  });
  logger.log(
    `uploadPackagePhotos extraction completed ${formatLogContext({
      barcode,
      hasProductName: Boolean(extraction.productName),
      hasProductBrand: Boolean(extraction.productBrand),
      ingredientCount: extraction.ingredients.length,
      traceCount: extraction.traces.length,
    })}`,
  );

  const missingFields = getMissingPackagePhotoFields(extraction);

  if (missingFields.length > 0) {
    return {
      status: 'needs_more_photos',
      missingFields,
      message: buildMissingPackagePhotoMessage(missingFields),
    };
  }

  const normalizedProduct = await attachFrontPackagePhotoImage({
    files: input.files,
    metadata,
    product: createPackagePhotoNormalizedProduct({ barcode, extraction }),
  });
  const existingProduct = await findByBarcode(barcode);
  const savedProduct = existingProduct
    ? shouldRefreshPhotoProduct(existingProduct, normalizedProduct)
      ? await createProduct(
          mergePhotoProduct(existingProduct, normalizedProduct),
          PACKAGE_PHOTO_PRODUCT_FLAGS,
        )
      : existingProduct
    : await createProduct(normalizedProduct, PACKAGE_PHOTO_PRODUCT_FLAGS);
  const productId = (await findProductIdByBarcode(barcode)) ?? undefined;
  const product = normalizeOpenFoodFactsProduct(barcode, savedProduct);
  const result = await analyzeNormalizedProductForUser({
    product,
    userId: input.userId,
    logContext: `package photos barcode=${barcode}`,
  });
  const scanId = await input.persistScanResult({
    userId: input.userId,
    barcode,
    source: 'photo',
    result,
    productId,
  });
  const metadataResult = await input.buildResultMetadata({
    userId: input.userId,
    barcode,
    scanId,
    productId,
  });

  return { ...result, barcode, ...metadataResult };
}
