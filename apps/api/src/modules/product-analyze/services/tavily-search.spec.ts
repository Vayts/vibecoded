import { searchProductNutritionWithTavily, resolvePhotoProductSearchProvider } from './tavily-search';

type TavilySearchResult = {
  title: string;
  url: string;
  content: string;
  rawContent?: string;
  score: number;
  publishedDate: string;
};

const mockSearch = jest.fn<
  Promise<{
    answer?: string;
    results: TavilySearchResult[];
  }>,
  [string, Record<string, unknown>?]
>();
const mockInvoke = jest.fn();
const mockWithStructuredOutput = jest.fn(() => ({ invoke: mockInvoke }));

jest.mock('@tavily/core', () => ({
  tavily: jest.fn(() => ({ search: mockSearch })),
}));

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    withStructuredOutput: mockWithStructuredOutput,
  })),
}));

describe('tavily-search', () => {
  const originalOpenAiApiKey = process.env.OPENAI_API_KEY;
  const originalTavilyApiKey = process.env.TAVILY_API_KEY;
  const originalProvider = process.env.PHOTO_PRODUCT_SEARCH_PROVIDER;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.PHOTO_PRODUCT_SEARCH_PROVIDER;
    process.env.OPENAI_API_KEY = 'openai-test-key';
    process.env.TAVILY_API_KEY = 'tavily-test-key';
  });

  afterAll(() => {
    process.env.OPENAI_API_KEY = originalOpenAiApiKey;
    process.env.TAVILY_API_KEY = originalTavilyApiKey;
    process.env.PHOTO_PRODUCT_SEARCH_PROVIDER = originalProvider;
  });

  it('defaults to websearch and switches to tavily when the provider flag is set', () => {
    expect(resolvePhotoProductSearchProvider()).toBe('websearch');

    process.env.PHOTO_PRODUCT_SEARCH_PROVIDER = 'tavily';

    expect(resolvePhotoProductSearchProvider()).toBe('tavily');
  });

  it('returns null without required API keys', async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.TAVILY_API_KEY;

    const result = await searchProductNutritionWithTavily({
      allText: 'Green Smile Oat Drink 1L',
      productName: 'Oat Drink',
      brand: 'Green Smile',
    });

    expect(result).toBeNull();
    expect(mockSearch).not.toHaveBeenCalled();
    expect(mockWithStructuredOutput).not.toHaveBeenCalled();
  });

  it('builds a normalized product from Tavily search data via AI structuring', async () => {
    mockSearch.mockResolvedValue({
      answer: 'Green Smile Oat Drink has 47 kcal per 100ml and Nutri-Score B.',
      results: [
        {
          title: 'Open Food Facts - Green Smile Oat Drink',
          url: 'https://world.openfoodfacts.org/product/123/green-smile-oat-drink',
          content: 'Energy 47 kcal, fat 1.5g, carbohydrates 6.8g, proteins 1.1g.',
          rawContent: 'Nutri-Score: B. Energy 47 kcal per 100ml.',
          score: 0.92,
          publishedDate: '2026-04-27',
        },
      ],
    });
    mockInvoke.mockResolvedValue({
      found: true,
      confidence: 0.89,
      source: 'OpenFoodFacts',
      product: {
        product_name: 'Oat Drink',
        brands: 'Green Smile',
        nutriscore_grade: 'b',
        nutrition: {
          energy_kcal_100g: 47,
          proteins_100g: 1.1,
          fat_100g: 1.5,
          saturated_fat_100g: 0.2,
          carbohydrates_100g: 6.8,
          sugars_100g: 3.5,
          fiber_100g: 0.8,
          salt_100g: 0.1,
          sodium_100g: 0.04,
        },
      },
    });

    const result = await searchProductNutritionWithTavily({
      allText: 'Green Smile Oat Drink 1L',
      productName: 'Oat Drink',
      brand: 'Green Smile',
    });

    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
    expect(result?.code.startsWith('photo-')).toBe(true);
    expect(result?.product_name).toBe('Oat Drink');
    expect(result?.brands).toBe('Green Smile');
    expect(result?.nutriscore_grade).toBe('b');
    expect(result?.scores.nutriscore_grade).toBe('b');
    expect(result?.nutrition.energy_kcal_100g).toBe(47);
    expect(result?.nutrition.carbohydrates_100g).toBe(6.8);
  });

  it('returns null when AI cannot produce meaningful nutrition data', async () => {
    mockSearch.mockResolvedValue({
      answer: 'No reliable nutrition found.',
      results: [],
    });
    mockInvoke.mockResolvedValue({
      found: true,
      confidence: 0.86,
      source: 'Unknown',
      product: {
        product_name: 'Oat Drink',
        brands: 'Green Smile',
        nutriscore_grade: null,
        nutrition: {
          energy_kcal_100g: null,
          proteins_100g: null,
          fat_100g: null,
          saturated_fat_100g: null,
          carbohydrates_100g: null,
          sugars_100g: null,
          fiber_100g: null,
          salt_100g: null,
          sodium_100g: null,
        },
      },
    });

    const result = await searchProductNutritionWithTavily({
      allText: 'Green Smile Oat Drink 1L',
      productName: 'Oat Drink',
      brand: 'Green Smile',
    });

    expect(result).toBeNull();
  });
});

