import type { NormalizedProduct } from '@acme/shared';
import { normalizeOpenFoodFactsProduct } from '../domain/product-normalization/normalize-openfoodfacts';
import type { OpenFoodFactsProduct } from '../domain/product-normalization/openfoodfacts-types';

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

/**
 * Look up a product by barcode on OpenFoodFacts.
 * Returns the normalized product or null if not found.
 */
export const lookupBarcode = async (barcode: string): Promise<NormalizedProduct | null> => {
  const client = await getClient();

  let response: OpenFoodFactsBarcodeResponse;

  try {
    response = await client.getProductV2(barcode);
  } catch {
    throw new OpenFoodFactsLookupError('UPSTREAM_ERROR', 'Unable to fetch product data');
  }

  const product = response.data?.product;

  if (response.data?.status !== 1 || !product) {
    return null;
  }

  return normalizeOpenFoodFactsProduct(barcode, product);
};
