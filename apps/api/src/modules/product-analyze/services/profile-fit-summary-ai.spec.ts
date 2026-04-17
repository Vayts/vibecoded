import type {
  NormalizedProduct,
  OnboardingResponse,
  ProfileProductScore,
  ScoreReason,
} from '@acme/shared';
import { generateProfileFitSummaries } from './profile-fit-summary-ai';

type SummaryBatchResult = {
  profiles: Array<{
    profileId: string;
    summary: string | null;
  }>;
};

type InvokeMessage = {
  role: string;
  content: string;
};

type InvokeFn = (messages: InvokeMessage[]) => Promise<SummaryBatchResult>;

const mockInvoke = jest.fn<ReturnType<InvokeFn>, Parameters<InvokeFn>>();
const mockWithStructuredOutput = jest.fn(() => ({
  invoke: mockInvoke,
}));

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest
    .fn()
    .mockImplementation(() => ({ withStructuredOutput: mockWithStructuredOutput })),
}));

const PRODUCT: NormalizedProduct = {
  code: '12345678',
  product_name: 'Test Product',
  brands: 'Acme',
  image_url: null,
  ingredients_text: 'Oats, milk powder',
  nutriscore_grade: null,
  categories: null,
  quantity: null,
  serving_size: null,
  ingredients: ['Oats', 'Milk powder'],
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
    energy_kcal_100g: 180,
    proteins_100g: 12,
    fat_100g: 4,
    saturated_fat_100g: 1.5,
    carbohydrates_100g: 24,
    sugars_100g: 6,
    fiber_100g: 5,
    salt_100g: 0.2,
    sodium_100g: 0.08,
  },
  scores: {
    nutriscore_grade: null,
    nutriscore_score: null,
    ecoscore_grade: null,
    ecoscore_score: null,
  },
};

const SELF_ONBOARDING: OnboardingResponse = {
  mainGoal: 'MUSCLE_GAIN',
  restrictions: [],
  allergies: [],
  otherAllergiesText: null,
  nutritionPriorities: ['HIGH_PROTEIN'],
  legacyDietType: null,
  onboardingCompleted: true,
};

const CHILD_ONBOARDING: OnboardingResponse = {
  mainGoal: 'GENERAL_HEALTH',
  restrictions: [],
  allergies: ['DAIRY'],
  otherAllergiesText: null,
  nutritionPriorities: ['LOW_SUGAR'],
  legacyDietType: null,
  onboardingCompleted: true,
};

const makeReason = (input: {
  key: string;
  label: string;
  description: string;
  impact: number;
  kind: ScoreReason['kind'];
  source: ScoreReason['source'];
  category?: ScoreReason['category'];
}): ScoreReason => ({
  key: input.key,
  label: input.label,
  description: input.description,
  value: null,
  unit: null,
  impact: input.impact,
  kind: input.kind,
  source: input.source,
  ...(input.category ? { category: input.category } : {}),
});

const SELF_SCORE: ProfileProductScore = {
  profileId: 'self',
  profileType: 'self',
  name: 'You',
  score: 84,
  fitLabel: 'good_fit',
  positives: [
    makeReason({
      key: 'protein',
      label: 'Protein',
      description: 'High protein content',
      impact: 10,
      kind: 'positive',
      source: 'nutrition',
      category: 'protein',
    }),
  ],
  negatives: [
    makeReason({
      key: 'sugar',
      label: 'Sugar',
      description: 'Moderate sugar content',
      impact: -2,
      kind: 'negative',
      source: 'nutrition',
      category: 'sugar',
    }),
  ],
};

const CHILD_SCORE: ProfileProductScore = {
  profileId: 'child',
  profileType: 'family_member',
  name: 'Child',
  score: 41,
  fitLabel: 'poor_fit',
  positives: [],
  negatives: [
    makeReason({
      key: 'allergen-dairy',
      label: 'Allergens',
      description: 'Contains milk ingredients',
      impact: -100,
      kind: 'negative',
      source: 'allergen',
      category: 'allergens',
    }),
  ],
};

describe('generateProfileFitSummaries', () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterAll(() => {
    process.env.OPENAI_API_KEY = originalApiKey;
  });

  it('uses one AI request for multiple profile summaries and maps results by profileId', async () => {
    mockInvoke.mockResolvedValue({
      profiles: [
        {
          profileId: 'child',
          summary:
            'This product is a poor fit because milk ingredients clash with your dairy allergy.',
        },
        {
          profileId: 'self',
          summary:
            'This product is a good fit because it delivers strong protein with only moderate sugar.',
        },
      ],
    });

    const result = await generateProfileFitSummaries({
      product: PRODUCT,
      profiles: [
        { onboarding: SELF_ONBOARDING, profileScore: SELF_SCORE },
        { onboarding: CHILD_ONBOARDING, profileScore: CHILD_SCORE },
      ],
    });

    expect(mockWithStructuredOutput).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    const messages = mockInvoke.mock.calls[0][0];
    expect(messages[1].content).toContain('Profile ID: self');
    expect(messages[1].content).toContain('Profile ID: child');

    expect(result.get('self')).toBe(
      'This product is a good fit because it delivers strong protein with only moderate sugar.',
    );
    expect(result.get('child')).toBe(
      'This product is a poor fit because milk ingredients clash with your dairy allergy.',
    );
  });

  it('returns fallback summaries without calling AI when the API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const result = await generateProfileFitSummaries({
      product: PRODUCT,
      profiles: [{ onboarding: SELF_ONBOARDING, profileScore: SELF_SCORE }],
    });

    expect(mockWithStructuredOutput).not.toHaveBeenCalled();
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result.get('self')).toBe('This product is a good fit because high protein content.');
  });
});
