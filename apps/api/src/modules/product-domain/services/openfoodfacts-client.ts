import type { NormalizedProduct } from '@acme/shared';
import { normalizeOpenFoodFactsProduct } from '../domain/product-normalization/normalize-openfoodfacts';
import type { OpenFoodFactsProduct } from '../domain/product-normalization/openfoodfacts-types';

interface OpenFoodFactsBarcodeResponse {
  code?: string;
  status?: string;
  product?: OpenFoodFactsProduct;
  status_verbose?: string;
}

interface OpenFoodFactsLookupFailure {
  code?: string;
  status?: string;
  result?: {
    id?: string;
    name?: string;
    lc_name?: string;
  };
  errors?: Array<{
    message?: {
      id?: string;
      name?: string;
      lc_name?: string;
    };
  }>;
}

interface OpenFoodFactsSdkResponse {
  data?: OpenFoodFactsBarcodeResponse;
  error?: unknown;
}

interface OpenFoodFactsClient {
  getProductV3(barcode: string): Promise<OpenFoodFactsSdkResponse>;
}

export class OpenFoodFactsLookupError extends Error {
  public readonly cause?: unknown;

  constructor(
    public readonly code: 'UPSTREAM_ERROR' | 'TIMEOUT',
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = 'OpenFoodFactsLookupError';
    this.cause = options?.cause;
  }
}

// ---------------------------------------------------------------------------
// Timeout + miss cache
// ---------------------------------------------------------------------------

const OFF_TIMEOUT_MS = 35_000;
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

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim();
  }

  return 'Unknown upstream error';
};

const stripHtml = (value: string): string =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isLookupFailureObject = (value: unknown): value is OpenFoodFactsLookupFailure => {
  return typeof value === 'object' && value !== null;
};

type FetchInput = Parameters<typeof globalThis.fetch>[0];
type FetchInit = Parameters<typeof globalThis.fetch>[1];

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const createTimeoutFetch = (baseFetch: typeof globalThis.fetch): typeof globalThis.fetch => {
  return async (input: FetchInput, init?: FetchInit) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);
    const onAbort = () => controller.abort();

    init?.signal?.addEventListener('abort', onAbort);

    try {
      return await baseFetch(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
      init?.signal?.removeEventListener('abort', onAbort);
    }
  };
};

let openFoodFactsClientPromise: Promise<OpenFoodFactsClient> | null = null;

const getOpenFoodFactsClient = async (): Promise<OpenFoodFactsClient> => {
  if (!openFoodFactsClientPromise) {
    openFoodFactsClientPromise = import('@openfoodfacts/openfoodfacts-nodejs')
      .then(({ OpenFoodFacts }) => new OpenFoodFacts(createTimeoutFetch(globalThis.fetch)))
      .catch((error: unknown) => {
        openFoodFactsClientPromise = null;
        throw new OpenFoodFactsLookupError(
          'UPSTREAM_ERROR',
          `Unable to load Open Food Facts client: ${toErrorMessage(error)}`,
          { cause: error },
        );
      });
  }

  return openFoodFactsClientPromise;
};

const getFailureMessage = (failure: unknown): string => {
  if (typeof failure === 'string') {
    if (failure.includes('429 Too Many Requests')) {
      return 'Open Food Facts rate limit exceeded (HTTP 429)';
    }

    const normalizedFailure = stripHtml(failure);
    return normalizedFailure.length > 0 ? normalizedFailure : 'Unknown upstream error';
  }

  if (!isLookupFailureObject(failure)) {
    return 'Unknown upstream error';
  }

  return (
    failure.result?.lc_name ??
    failure.result?.name ??
    failure.errors?.find((entry) => entry.message?.lc_name || entry.message?.name)?.message
      ?.lc_name ??
    failure.errors?.find((entry) => entry.message?.lc_name || entry.message?.name)?.message?.name ??
    'Unknown upstream error'
  );
};

const isMissingProductFailure = (failure: OpenFoodFactsLookupFailure): boolean => {
  if (!isLookupFailureObject(failure)) {
    return false;
  }

  if (failure.result?.id === 'product_not_found') {
    return true;
  }

  return (
    failure.errors?.some((entry) => {
      return entry.message?.id === 'product_not_found' || entry.message?.id === 'invalid_code';
    }) ?? false
  );
};

const fetchProduct = async (barcode: string): Promise<OpenFoodFactsBarcodeResponse | null> => {
  try {
    const openFoodFactsClient = await getOpenFoodFactsClient();
    const response = await openFoodFactsClient.getProductV3(barcode);

    if (response.error) {
      if (isMissingProductFailure(response.error)) {
        return null;
      }

      throw new OpenFoodFactsLookupError(
        'UPSTREAM_ERROR',
        `Open Food Facts error: ${getFailureMessage(response.error)}`,
        { cause: response.error },
      );
    }

    if (!response.data) {
      throw new OpenFoodFactsLookupError(
        'UPSTREAM_ERROR',
        'Open Food Facts returned an empty response',
      );
    }

    return response.data;
  } catch (error) {
    if (error instanceof OpenFoodFactsLookupError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new OpenFoodFactsLookupError(
        'TIMEOUT',
        `OFF lookup timed out after ${OFF_TIMEOUT_MS}ms`,
        { cause: error },
      );
    }

    throw new OpenFoodFactsLookupError(
      'UPSTREAM_ERROR',
      `Unable to fetch product data: ${toErrorMessage(error)}`,
      { cause: error },
    );
  }
};

export const lookupBarcode = async (barcode: string): Promise<NormalizedProduct | null> => {
  if (isCachedMiss(barcode)) {
    return null;
  }

  let response: OpenFoodFactsBarcodeResponse | null;

  try {
    response = await fetchProduct(barcode);
  } catch (err) {
    if (err instanceof OpenFoodFactsLookupError && err.code === 'TIMEOUT') {
      console.warn(`[OFF] ⏱ Timeout (${OFF_TIMEOUT_MS}ms) for barcode=${barcode}`);
    }

    throw err;
  }

  if (!response) {
    recordMiss(barcode);
    return null;
  }

  const product = response.product;

  console.log(JSON.stringify(product, null, 2));

  if (!product) {
    recordMiss(barcode);
    return null;
  }

  return normalizeOpenFoodFactsProduct(barcode, product);
};
