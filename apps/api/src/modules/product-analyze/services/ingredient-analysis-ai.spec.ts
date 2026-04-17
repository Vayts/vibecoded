import type { NormalizedProduct, OnboardingResponse } from '@acme/shared';
import { analyzeIngredientsForProfiles } from './ingredient-analysis-ai';

type IngredientBatchResult = {
  profiles: Array<{
    profileId: string;
    ingredients: Array<{
      name: string;
      status: 'good' | 'neutral' | 'warning' | 'bad';
      reason: string | null;
    }>;
    summary: string | null;
  }>;
};

type InvokeMessage = {
  role: string;
  content: string;
};

type InvokeFn = (messages: InvokeMessage[]) => Promise<IngredientBatchResult>;

const mockInvoke = jest.fn<ReturnType<InvokeFn>, Parameters<InvokeFn>>();
const mockWithStructuredOutput = jest.fn(() => ({
  invoke: mockInvoke,
}));

jest.mock('@langchain/openai', () => {
  return {
    ChatOpenAI: jest
      .fn()
      .mockImplementation(() => ({ withStructuredOutput: mockWithStructuredOutput })),
  };
});

const PRODUCT: NormalizedProduct = {
  code: '12345678',
  product_name: 'Test Product',
  brands: 'Acme',
  image_url: null,
  ingredients_text: 'Sugar, milk powder',
  nutriscore_grade: null,
  categories: null,
  quantity: null,
  serving_size: null,
  ingredients: ['Sugar', 'Milk powder'],
  allergens: ['milk'],
  additives: [],
  additives_count: 0,
  traces: [],
  countries: [],
  category_tags: [],
  images: {
    front_url: null,
    ingredients_url: null,
    nutrition_url: null,
  },
  nutrition: {
    energy_kcal_100g: 120,
    proteins_100g: 3,
    fat_100g: 2,
    saturated_fat_100g: 1,
    carbohydrates_100g: 22,
    sugars_100g: 18,
    fiber_100g: 0,
    salt_100g: 0.1,
    sodium_100g: 0.04,
  },
  scores: {
    nutriscore_grade: null,
    nutriscore_score: null,
    ecoscore_grade: null,
    ecoscore_score: null,
  },
};

const SELF_ONBOARDING: OnboardingResponse = {
  mainGoal: null,
  restrictions: [],
  allergies: ['DAIRY'],
  otherAllergiesText: null,
  nutritionPriorities: [],
  legacyDietType: null,
  onboardingCompleted: true,
};

const CHILD_ONBOARDING: OnboardingResponse = {
  mainGoal: 'GENERAL_HEALTH',
  restrictions: [],
  allergies: [],
  otherAllergiesText: null,
  nutritionPriorities: ['LOW_SUGAR'],
  legacyDietType: null,
  onboardingCompleted: true,
};

describe('analyzeIngredientsForProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses one AI request for multiple profiles and maps results by profileId', async () => {
    mockInvoke.mockResolvedValue({
      profiles: [
        {
          profileId: 'child',
          ingredients: [
            {
              name: 'Sugar',
              status: 'warning',
              reason: 'Conflicts with low sugar priority',
            },
            {
              name: 'Milk Powder',
              status: 'neutral',
              reason: null,
            },
          ],
          summary: 'Sugar is a concern for this profile.',
        },
        {
          profileId: 'self',
          ingredients: [
            {
              name: 'Sugar',
              status: 'neutral',
              reason: null,
            },
            {
              name: 'Milk Powder',
              status: 'bad',
              reason: 'Conflicts with dairy allergy',
            },
          ],
          summary: 'Milk powder conflicts with dairy allergy.',
        },
      ],
    });

    const result = await analyzeIngredientsForProfiles(PRODUCT, [
      { profileId: 'self', onboarding: SELF_ONBOARDING },
      { profileId: 'child', onboarding: CHILD_ONBOARDING },
    ]);

    expect(mockWithStructuredOutput).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    const messages = mockInvoke.mock.calls[0][0];
    expect(messages[1].content).toContain('Profile ID: self');
    expect(messages[1].content).toContain('Profile ID: child');

    expect(result.get('self')).toEqual({
      ingredients: [
        {
          name: 'Sugar',
          status: 'neutral',
          reason: null,
        },
        {
          name: 'Milk Powder',
          status: 'bad',
          reason: 'Conflicts with dairy allergy',
        },
      ],
      summary: 'Milk powder conflicts with dairy allergy.',
    });
    expect(result.get('child')).toEqual({
      ingredients: [
        {
          name: 'Sugar',
          status: 'warning',
          reason: 'Conflicts with low sugar priority',
        },
        {
          name: 'Milk Powder',
          status: 'neutral',
          reason: null,
        },
      ],
      summary: 'Sugar is a concern for this profile.',
    });
  });

  it('returns null entries without calling AI when the product has no ingredients', async () => {
    const result = await analyzeIngredientsForProfiles(
      {
        ...PRODUCT,
        ingredients_text: null,
        ingredients: [],
      },
      [{ profileId: 'self', onboarding: SELF_ONBOARDING }],
    );

    expect(mockWithStructuredOutput).not.toHaveBeenCalled();
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result.get('self')).toBeNull();
  });
});
