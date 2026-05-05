import type { NormalizedProduct } from '@acme/shared';
import { ApiError } from '../../../shared/errors/api-error.js';
import { resolveCanonicalProductImageUrl } from '../../../shared/utils/product-image.js';
import { processProductImage } from '../../product-analyze/lib/image-processing.js';
import { uploadProductImage } from '../../product-analyze/lib/storage.js';
import {
  createProduct,
  findByBarcode,
  findByCanonicalProductText,
} from '../../product-analyze/repositories/productRepository.js';
import { findProductIdByBarcode } from '../../product-analyze/repositories/scanRepository.js';
import { attachPhotoImagePathV2 } from '../utils/attach-photo-image-path.util.js';
import { extractTextFromPhotoV2 } from './photo-ocr.service.js';
import searchPhotoProductNutritionWithTavilyV2 from './tavily-photo-product-search.service.js';
import type { AnalyzePhotoV2Input, PhotoOcrPayloadV2 } from '../types/analyze-photo-v2.types.js';

export interface ResolvedPhotoProductV2Context {
  product: NormalizedProduct;
  productId?: string;
}

const hasValidImage = (product: NormalizedProduct): boolean =>
  resolveCanonicalProductImageUrl(product.image_url, product.images) !== null;

const ensureProductImage = async (
  imageBase64: string,
  product: NormalizedProduct,
): Promise<NormalizedProduct> => {
  if (hasValidImage(product)) {
    return product;
  }

  try {
    const rawBuffer = Buffer.from(imageBase64, 'base64');
    const processed = await processProductImage(rawBuffer);
    const photoImagePath = await uploadProductImage(processed.buffer);

    return createProduct(attachPhotoImagePathV2(product, photoImagePath));
  } catch (error) {
    console.error(
      '[ProductAnalyzeV2:photo] Image processing/upload failed:',
      error instanceof Error ? error.message : error,
    );
    return product;
  }
};

const resolveOcr = async (input: AnalyzePhotoV2Input): Promise<PhotoOcrPayloadV2> => {
  const ocr = input.ocr ?? (await extractTextFromPhotoV2(input.imageBase64));

  if (!ocr) {
    throw ApiError.unprocessable('Could not read text from photo', 'OCR_FAILED');
  }

  if (!ocr.isFoodProduct) {
    throw ApiError.unprocessable('This product does not appear to be a food item', 'NOT_FOOD');
  }

  return ocr;
};

const reuseOrCreateProduct = async (product: NormalizedProduct): Promise<NormalizedProduct> => {
  const existingByBarcode = await findByBarcode(product.code);
  if (existingByBarcode) {
    return existingByBarcode;
  }

  const existingByText = await findByCanonicalProductText(product.product_name, product.brands);
  if (existingByText) {
    return existingByText;
  }

  return createProduct(product);
};

export const resolvePhotoProductV2Context = async (
  input: AnalyzePhotoV2Input,
): Promise<ResolvedPhotoProductV2Context> => {
  const ocr = await resolveOcr(input);
  const product = await searchPhotoProductNutritionWithTavilyV2({
    allText: ocr.allText,
    productName: ocr.productName,
    brand: ocr.brand,
  });

  if (!product) {
    throw ApiError.notFound('Could not identify product from photo', 'PRODUCT_NOT_FOUND');
  }

  const savedProduct = await ensureProductImage(
    input.imageBase64,
    await reuseOrCreateProduct(product),
  );
  const productId = await findProductIdByBarcode(savedProduct.code);

  return {
    product: savedProduct,
    productId: productId ?? undefined,
  };
};
