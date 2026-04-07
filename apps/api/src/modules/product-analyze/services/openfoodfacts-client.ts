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
    public readonly code: 'UPSTREAM_ERROR' | 'TIMEOUT',
    message: string,
  ) {
    super(message);
    this.name = 'OpenFoodFactsLookupError';
  }
}

// ---------------------------------------------------------------------------
// Timeout + miss cache
// ---------------------------------------------------------------------------

const OFF_TIMEOUT_MS = 6_000; // 6s max for OpenFoodFacts API
const MISS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/** In-memory cache of barcodes known to be missing from OFF */
const missCache = new Map<string, number>();

const isCachedMiss = (barcode: string): boolean => {
  const ts = missCache.get(barcode);
  if (!ts) return false;
  if (Date.now() - ts > MISS_CACHE_TTL_MS) {
    missCache.delete(barcode);
    return false;
  }
  return true;
};

const recordMiss = (barcode: string): void => {
  missCache.set(barcode, Date.now());
  // Prevent unbounded growth — evict oldest if > 10k entries
  if (missCache.size > 10_000) {
    const oldest = missCache.keys().next().value;
    if (oldest) missCache.delete(oldest);
  }
};

const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new OpenFoodFactsLookupError(
            'TIMEOUT',
            `${label} timed out after ${ms}ms`,
          ),
        ),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

let clientPromise: Promise<OpenFoodFactsClient> | null = null;

const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<{
  OpenFoodFacts: new (fetchFn: typeof globalThis.fetch) => OpenFoodFactsClient;
}>;

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
 * Enforces a 6s timeout and caches misses for 24h.
 */
export const lookupBarcode = async (
  barcode: string,
): Promise<NormalizedProduct | null> => {
  if (isCachedMiss(barcode)) {
    console.log(
      `[OFF] cache-miss hit for barcode=${barcode} — skipping API call`,
    );
    return null;
  }

  const client = await getClient();

  let response: OpenFoodFactsBarcodeResponse;

  try {
    response = await withTimeout(
      client.getProductV2(barcode),
      OFF_TIMEOUT_MS,
      'OFF lookup',
    );
  } catch (err) {
    if (err instanceof OpenFoodFactsLookupError && err.code === 'TIMEOUT') {
      console.warn(
        `[OFF] ⏱ Timeout (${OFF_TIMEOUT_MS}ms) for barcode=${barcode}`,
      );
      return null;
    }
    throw new OpenFoodFactsLookupError(
      'UPSTREAM_ERROR',
      'Unable to fetch product data',
    );
  }

  const product = response.data?.product;

  if (response.data?.status !== 1 || !product) {
    recordMiss(barcode);
    return null;
  }

  return normalizeOpenFoodFactsProduct(barcode, product);
};
