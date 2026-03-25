import type { BarcodeLookupNotFoundResponse, BarcodeLookupSuccessResponse } from '@acme/shared';
import { normalizeOpenFoodFactsProduct } from './openFoodFactsNormalizer';
import type { OpenFoodFactsProduct } from './openFoodFactsTypes';
import { createProduct, findByBarcode } from './productRepository';
import { createScanNotFoundResponse, createScanSuccessResponse } from './scannerLookupResponse';

const OFF_SOURCE = 'openfoodfacts';

interface OpenFoodFactsBarcodeResponse {
  data?: {
    status?: number;
    product?: OpenFoodFactsProduct;
  };
}

interface OpenFoodFactsClient {
  getProductV2(barcode: string): Promise<OpenFoodFactsBarcodeResponse>;
}

export class OpenFoodFactsLookupError extends Error {
  constructor(
    public readonly code: 'UPSTREAM_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'OpenFoodFactsLookupError';
  }
}

let clientPromise: Promise<OpenFoodFactsClient> | null = null;

const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<{ OpenFoodFacts: new (fetchFn: typeof globalThis.fetch) => OpenFoodFactsClient }>;

const getClient = async (): Promise<OpenFoodFactsClient> => {
  if (!clientPromise) {
    clientPromise = dynamicImport('@openfoodfacts/openfoodfacts-nodejs')
      .then(({ OpenFoodFacts }) => new OpenFoodFacts(globalThis.fetch))
      .catch(() => {
        clientPromise = null;
        throw new OpenFoodFactsLookupError(
          'UPSTREAM_ERROR',
          'Unable to load Open Food Facts client',
        );
      });
  }

  return clientPromise;
};

export const lookupProductByBarcode = async (
  barcode: string,
  userId?: string,
): Promise<BarcodeLookupSuccessResponse | BarcodeLookupNotFoundResponse> => {
  const cachedProduct = await findByBarcode(barcode);

  if (cachedProduct) {
    return createScanSuccessResponse(barcode, OFF_SOURCE, cachedProduct, userId);
  }

  const client = await getClient();

  let response: OpenFoodFactsBarcodeResponse;

  try {
    response = await client.getProductV2(barcode);
  } catch {
    throw new OpenFoodFactsLookupError('UPSTREAM_ERROR', 'Unable to fetch product data');
  }

  const product = response.data?.product;

  if (response.data?.status !== 1 || !product) {
    return createScanNotFoundResponse(barcode, OFF_SOURCE);
  }

  const normalizedProduct = normalizeOpenFoodFactsProduct(barcode, product);
  const cachedNormalizedProduct = await createProduct(normalizedProduct);

  return createScanSuccessResponse(barcode, OFF_SOURCE, cachedNormalizedProduct, userId);
};
