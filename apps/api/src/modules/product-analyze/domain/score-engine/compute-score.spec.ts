import type {
  IngredientAnalysis,
  NormalizedProduct,
  OnboardingResponse,
  ProductFacts,
} from '@acme/shared';
import { computeProfileScore, type ScoreProfileInput } from './compute-score';

const PRODUCT: NormalizedProduct = {
  code: '12345678',
  product_name: 'Test Product',
  brands: 'Acme',
  image_url: null,
  ingredients_text:
    'Milk, peanuts, soy lecithin, gelatin, pork-derived enzyme, alcohol-based flavoring',
  nutriscore_grade: null,
  categories: null,
  quantity: null,
  serving_size: null,
  ingredients: [
    'milk',
    'peanuts',
    'soy lecithin',
    'gelatin',
    'pork-derived enzyme',
    'alcohol-based flavoring',
  ],
  allergens: ['milk', 'peanuts', 'soy'],
  additives: ['e330', 'e202'],
  additives_count: 2,
  traces: [],
  countries: [],
  category_tags: [],
  images: {
    front_url: null,
    ingredients_url: null,
    nutrition_url: null,
  },
  nutrition: {
    energy_kcal_100g: 240,
    proteins_100g: 8,
    fat_100g: 12,
    saturated_fat_100g: 4,
    carbohydrates_100g: 18,
    sugars_100g: 14,
    fiber_100g: 2,
    salt_100g: 0.8,
    sodium_100g: 0.32,
  },
  scores: {
    nutriscore_grade: null,
    nutriscore_score: null,
    ecoscore_grade: null,
    ecoscore_score: null,
  },
};

const FACTS: ProductFacts = {
  productType: 'snack',
  dietCompatibility: {
    vegan: 'incompatible',
    vegetarian: 'compatible',
    halal: 'incompatible',
    kosher: 'compatible',
    glutenFree: 'compatible',
    dairyFree: 'incompatible',
    nutFree: 'incompatible',
  },
  dietCompatibilityReasons: {
    vegan: 'Contains milk and gelatin',
    vegetarian: null,
    halal: 'Contains gelatin and alcohol-based flavoring',
    kosher: null,
    glutenFree: null,
    dairyFree: 'Contains milk',
    nutFree: 'Contains peanuts',
  },
  nutritionFacts: {
    calories: 240,
    protein: 8,
    fat: 12,
    saturatedFat: 4,
    carbs: 18,
    sugars: 14,
    fiber: 2,
    salt: 0.8,
    sodium: 0.32,
  },
  nutritionSummary: {
    sugarLevel: 'high',
    saltLevel: 'moderate',
    calorieLevel: 'moderate',
    proteinLevel: 'moderate',
    fiberLevel: 'moderate',
    saturatedFatLevel: 'moderate',
  },
  nutriGrade: null,
};

const MEAT_FACTS: ProductFacts = {
  productType: 'meat',
  dietCompatibility: {
    vegan: 'incompatible',
    vegetarian: 'compatible',
    halal: 'compatible',
    kosher: 'compatible',
    glutenFree: 'compatible',
    dairyFree: 'compatible',
    nutFree: 'compatible',
  },
  dietCompatibilityReasons: {
    vegan: 'Contains meat',
    vegetarian: null,
    halal: null,
    kosher: null,
    glutenFree: null,
    dairyFree: null,
    nutFree: null,
  },
  nutritionFacts: {
    calories: 122,
    protein: 24,
    fat: 2.5,
    saturatedFat: 0.9,
    carbs: 0.9,
    sugars: 0.9,
    fiber: 0,
    salt: 1.4,
    sodium: 0.56,
  },
  nutritionSummary: {
    sugarLevel: 'low',
    saltLevel: 'moderate',
    calorieLevel: 'moderate',
    proteinLevel: 'moderate',
    fiberLevel: 'low',
    saturatedFatLevel: 'low',
  },
  nutriGrade: null,
};

const ONBOARDING: OnboardingResponse = {
  mainGoal: null,
  restrictions: ['HALAL'],
  allergies: ['DAIRY', 'PEANUTS', 'SOY'],
  otherAllergiesText: null,
  nutritionPriorities: [],
  legacyDietType: null,
  onboardingCompleted: true,
};

const PROFILE: ScoreProfileInput = {
  profileId: 'you',
  profileType: 'self',
  name: 'You',
  onboarding: ONBOARDING,
};

const INGREDIENT_ANALYSIS: IngredientAnalysis = {
  ingredients: [
    { name: 'Milk', status: 'bad', reason: 'Conflicts with dairy allergy' },
    { name: 'Peanuts', status: 'bad', reason: 'Conflicts with peanut allergy' },
    { name: 'Soy Lecithin', status: 'bad', reason: 'Conflicts with soy allergy' },
    { name: 'Gelatin', status: 'bad', reason: 'Not halal' },
    {
      name: 'Pork-derived enzyme',
      status: 'bad',
      reason: 'Conflicts with halal restriction',
    },
    {
      name: 'Alcohol-based flavoring',
      status: 'bad',
      reason: 'Conflicts with halal restriction',
    },
    { name: 'Citric acid', status: 'warning', reason: 'Common additive' },
  ],
  summary: 'Several ingredients conflict with allergies and halal restriction.',
};

describe('computeProfileScore', () => {
  it('aggregates allergen, diet, and additive facts into category rows', () => {
    const result = computeProfileScore(
      PRODUCT,
      FACTS,
      PROFILE,
      INGREDIENT_ANALYSIS,
    );

    const allergenItems = result.negatives.filter(
      (item) => item.category === 'allergens',
    );
    expect(allergenItems).toHaveLength(1);
    expect(allergenItems[0].label).toBe('Allergens');
    expect(allergenItems[0].description.toLowerCase()).toContain('milk');
    expect(allergenItems[0].description.toLowerCase()).toContain('peanuts');
    expect(allergenItems[0].description.toLowerCase()).toContain('soy');

    const dietItems = result.negatives.filter(
      (item) => item.category === 'diet-matching',
    );
    expect(dietItems).toHaveLength(1);
    expect(dietItems[0].label).toBe('Diet matching');
    expect(dietItems[0].description.toLowerCase()).toContain('halal');
    expect(dietItems[0].description.toLowerCase()).toContain('gelatin');

    const additiveItems = result.negatives.filter(
      (item) => item.category === 'additives',
    );
    expect(additiveItems).toHaveLength(1);
    expect(additiveItems[0].value).toBe(2);
    expect(additiveItems[0].description.toLowerCase()).toContain('e330');
    expect(additiveItems[0].description.toLowerCase()).toContain('e202');
  });

  it('merges multiple restriction conflicts into one diet matching negative', () => {
    const multiRestrictionProfile: ScoreProfileInput = {
      ...PROFILE,
      onboarding: {
        ...ONBOARDING,
        restrictions: ['VEGAN', 'HALAL', 'KOSHER'],
        allergies: [],
      },
    };

    const result = computeProfileScore(
      PRODUCT,
      FACTS,
      multiRestrictionProfile,
      INGREDIENT_ANALYSIS,
    );

    const dietItems = result.negatives.filter(
      (item) => item.category === 'diet-matching',
    );

    expect(dietItems).toHaveLength(1);
    expect(dietItems[0].label).toBe('Diet matching');
    expect(dietItems[0].description).toBe(
      'Conflicts with your diet (vegan, halal, kosher). Contains milk, gelatin, alcohol-based flavoring, pork-derived enzyme',
    );
  });

  it('merges neutral nutrition and goal reasons for the same category', () => {
    const lowSugarProfile: ScoreProfileInput = {
      ...PROFILE,
      onboarding: {
        ...ONBOARDING,
        restrictions: [],
        allergies: [],
        nutritionPriorities: ['LOW_SUGAR'],
      },
    };

    const result = computeProfileScore(PRODUCT, MEAT_FACTS, lowSugarProfile);

    const sugarItems = result.positives.filter((item) => item.category === 'sugar');

    expect(sugarItems).toHaveLength(1);
    expect(sugarItems[0].key).toBe('sugar');
    expect(sugarItems[0].kind).toBe('positive');
    expect(sugarItems[0].description).toContain('Sugar content for meat products');
    expect(sugarItems[0].description).toContain('Fits your low sugar preference');
  });
});