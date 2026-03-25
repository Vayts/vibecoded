import { lookupProductByBarcode } from './openFoodFacts';
import { photoIdentificationSchema } from './productPhotoLookupSchema';

interface SearchHit {
  code?: unknown;
  product_name?: unknown;
  brands?: unknown;
}

interface SearchApiClient {
  searchGet(query?: {
    q?: string | null;
    langs?: string;
    page_size?: number;
    page?: number;
    fields?: string;
  }): Promise<{ data?: { hits?: SearchHit[] } | { errors?: unknown } }>;
}

interface ScoredHit {
  hit: SearchHit;
  score: number;
}

let searchClientPromise: Promise<SearchApiClient> | null = null;

const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<{ SearchApi: new (fetchFn: typeof globalThis.fetch) => SearchApiClient }>;

const getSearchClient = async (): Promise<SearchApiClient> => {
  if (!searchClientPromise) {
    searchClientPromise = dynamicImport('@openfoodfacts/openfoodfacts-nodejs')
      .then(({ SearchApi }) => new SearchApi(globalThis.fetch))
      .catch((error) => {
        searchClientPromise = null;
        throw error;
      });
  }

  return searchClientPromise;
};

const normalizeText = (value: unknown): string => {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
};

const scoreHit = (
  hit: SearchHit,
  identification: ReturnType<typeof photoIdentificationSchema.parse>,
): number => {
  const productName = normalizeText(hit.product_name);
  const brands = normalizeText(hit.brands);
  const desiredName = normalizeText(identification.productName);
  const desiredBrand = normalizeText(identification.brand);
  let score = 0;

  if (desiredName && productName.includes(desiredName)) {
    score += 3;
  }

  if (desiredBrand && brands.includes(desiredBrand)) {
    score += 2;
  }

  if (desiredName) {
    const nameParts = desiredName.split(/\s+/).filter((part) => part.length > 2);
    score += nameParts.filter((part) => productName.includes(part)).length;
  }

  return score;
};

const buildQuery = (identification: ReturnType<typeof photoIdentificationSchema.parse>): string | null => {
  const parts = [identification.productName, identification.brand, identification.categoryGuess]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => `"${value.trim()}"`);

  if (parts.length === 0) {
    return identification.searchQuery;
  }

  return parts.join(' ');
};

const getHits = (response: Awaited<ReturnType<SearchApiClient['searchGet']>>): SearchHit[] => {
  const data = response.data;

  if (!data || !('hits' in data) || !Array.isArray(data.hits)) {
    return [];
  }

  return data.hits;
};

export const lookupPhotoProductInOpenFoodFacts = async (
  identification: ReturnType<typeof photoIdentificationSchema.parse>,
  userId?: string,
) => {
  const query = buildQuery(identification);

  if (!query) {
    return null;
  }

  const client = await getSearchClient();
  const response = await client.searchGet({
    q: query,
    langs: 'en',
    page: 1,
    page_size: 5,
    fields: 'code,product_name,brands',
  });

  const hits = getHits(response);
  const bestHit = hits
    .map((hit): ScoredHit => ({ hit, score: scoreHit(hit, identification) }))
    .sort((left: ScoredHit, right: ScoredHit) => right.score - left.score)[0];

  if (!bestHit || bestHit.score < 2 || typeof bestHit.hit.code !== 'string') {
    return null;
  }

  const barcode = bestHit.hit.code.replace(/\D/g, '');
  if (!/^\d{8,32}$/.test(barcode)) {
    return null;
  }

  const result = await lookupProductByBarcode(barcode, userId);
  return result.success ? result : null;
};