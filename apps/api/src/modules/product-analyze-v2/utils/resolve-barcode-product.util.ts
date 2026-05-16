import { type NormalizedProduct } from '@acme/shared';
import { ApiError } from '../../../shared/errors/api-error.js';
import {
  createProduct,
  findByBarcode,
} from '../../product-domain/repositories/productRepository.js';
import { findProductIdByBarcode } from '../../product-domain/repositories/scanRepository.js';
import {
  lookupBarcode,
  OpenFoodFactsLookupError,
} from '../../product-domain/services/openfoodfacts-client.js';
import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import {
  hasEnoughProductInformation,
  hasRequiredOpenFoodFactsBarcodeData,
  normalizeOpenFoodFactsProduct,
} from './normalize-open-food-facts-product.util.js';

interface ResolvedBarcodeProductContext {
  product: NormalizedProductV2;
  productId?: string;
  source: 'database' | 'openfoodfacts';
}

const createNotFoundError = () => {
  return ApiError.notFound('Product not found for this barcode', 'PRODUCT_NOT_FOUND');
};

const ensureProductIsAnalyzable = (product: NormalizedProductV2): void => {
  if (!hasEnoughProductInformation(product)) {
    throw ApiError.unprocessable(
      'Not enough information about product',
      'INSUFFICIENT_PRODUCT_DATA',
    );
  }
};

const persistOpenFoodFactsProduct = async (
  product: NormalizedProduct,
): Promise<string | undefined> => {
  await createProduct(product);
  return (await findProductIdByBarcode(product.code)) ?? undefined;
};

export async function resolveBarcodeProductContext(input: {
  barcode: string;
}): Promise<ResolvedBarcodeProductContext> {
  const databaseProduct = await findByBarcode(input.barcode);

  if (databaseProduct) {
    const normalizedProduct = normalizeOpenFoodFactsProduct(input.barcode, databaseProduct);
    ensureProductIsAnalyzable(normalizedProduct);

    return {
      product: normalizedProduct,
      productId: (await findProductIdByBarcode(input.barcode)) ?? undefined,
      source: 'database',
    };
  }

  let openFoodFactsProduct: NormalizedProduct | null;
  try {
    openFoodFactsProduct = await lookupBarcode(input.barcode);
  } catch (error) {
    console.log(error)
      throw ApiError.badGateway(
        'Product data service is temporarily unavailable',
        'OFF_UPSTREAM_ERROR',
      );
      throw createNotFoundError();
    }

    throw error;
  }

  if (!openFoodFactsProduct) {
    throw createNotFoundError();
  }

  const normalizedProduct = normalizeOpenFoodFactsProduct(input.barcode, openFoodFactsProduct);
  if (!hasRequiredOpenFoodFactsBarcodeData(normalizedProduct)) {
    throw createNotFoundError();
  }

  ensureProductIsAnalyzable(normalizedProduct);

  return {
    product: normalizedProduct,
    productId: await persistOpenFoodFactsProduct(openFoodFactsProduct),
    source: 'openfoodfacts',
  };
}
