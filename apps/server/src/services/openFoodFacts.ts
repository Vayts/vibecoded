import type { BarcodeLookupNotFoundResponse, BarcodeLookupSuccessResponse } from '@acme/shared';
import { buildProductAnalysisFallback } from './productAnalysisFallback';
import { normalizeOpenFoodFactsProduct } from './openFoodFactsNormalizer';
import type { OpenFoodFactsProduct } from './openFoodFactsTypes';
import { createPersonalAnalysisJob } from './personalAnalysisJobs';

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

const createNotFoundResponse = (barcode: string): BarcodeLookupNotFoundResponse => {
  return {
    success: false,
    barcode,
    source: OFF_SOURCE,
    error: 'PRODUCT_NOT_FOUND',
  };
};

export const lookupProductByBarcode = async (
  barcode: string,
  userId?: string,
): Promise<BarcodeLookupSuccessResponse | BarcodeLookupNotFoundResponse> => {
  const client = await getClient();

  let response: OpenFoodFactsBarcodeResponse;

  try {
    response = await client.getProductV2(barcode);

    console.log(JSON.stringify(response, null, 2));
  } catch {
    throw new OpenFoodFactsLookupError('UPSTREAM_ERROR', 'Unable to fetch product data');
  }

  const product = response.data?.product;

  if (response.data?.status !== 1 || !product) {
    return createNotFoundResponse(barcode);
  }

  const normalizedProduct = normalizeOpenFoodFactsProduct(barcode, product);

  const personalAnalysis = createPersonalAnalysisJob(normalizedProduct, userId);

  return {
    success: true,
    barcode,
    source: OFF_SOURCE,
    product: normalizedProduct,
    evaluation: buildProductAnalysisFallback(normalizedProduct),
    personalAnalysis,
  };
};
