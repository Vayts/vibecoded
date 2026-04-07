import type {
  ProductFacts,
  ScoreReason,
  FitLabel,
  ProfileProductScore,
  NutritionLevel,
  ProductType,
  ScoreBreakdown,
  ScoreBreakdownStep,
  IngredientAnalysis,
} from '@acme/shared';
import type { OnboardingResponse } from '@acme/shared';

// ============================================================
// Score constants
// ============================================================

const BASE_SCORE = 65;
const MAX_SCORE = 100;
const MIN_SCORE = 0;

const clamp = (score: number): number => Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));

const getFitLabel = (score: number): FitLabel => {
  if (score >= 80) return 'great_fit';
  if (score >= 60) return 'good_fit';
  if (score >= 40) return 'neutral';
  return 'poor_fit';
};

// ============================================================
// Category-aware nutrition thresholds & impact weights (per 100g)
// ============================================================
// Thresholds and scoring impacts vary by product type so that e.g.
// 500 kcal in chips is "expected‐high" while 50 kcal in a beverage
// is already notable.  When product type is unknown we fall back to
// conservative defaults.

interface NutrientProfile {
  low: number;
  high: number;
  goodImpact: number;
  badImpact: number;
}

type NutrientKey = 'sugar' | 'salt' | 'saturatedFat' | 'calories' | 'protein' | 'fiber';

interface CategoryProfile {
  sugar: NutrientProfile;
  salt: NutrientProfile;
  saturatedFat: NutrientProfile;
  calories: NutrientProfile;
  protein: NutrientProfile;
  fiber: NutrientProfile;
  /** Nutrients to skip entirely for this product type (irrelevant for category) */
  skip: Set<NutrientKey>;
}

//                          low   high  good  bad
const NO_SKIP = new Set<NutrientKey>();

const DEFAULT_PROFILE: CategoryProfile = {
  sugar:        { low: 5,    high: 12.5, goodImpact: 10,  badImpact: -15 },
  salt:         { low: 0.3,  high: 1.5,  goodImpact: 5,   badImpact: -10 },
  saturatedFat: { low: 1.5,  high: 5,    goodImpact: 5,   badImpact: -10 },
  calories:     { low: 100,  high: 250,  goodImpact: 5,   badImpact: -10 },
  protein:      { low: 5,    high: 15,   goodImpact: 10,  badImpact: -5  },
  fiber:        { low: 1.5,  high: 5,    goodImpact: 8,   badImpact: -5  },
  skip:         NO_SKIP,
};

const CATEGORY_PROFILES: Partial<Record<ProductType, Partial<CategoryProfile>>> = {
  // Beverages: very strict — even moderate values are notable
  beverage: {
    sugar:        { low: 2.5,  high: 8,    goodImpact: 10,  badImpact: -15 },
    salt:         { low: 0.1,  high: 0.5,  goodImpact: 3,   badImpact: -8  },
    saturatedFat: { low: 0.5,  high: 2,    goodImpact: 3,   badImpact: -8  },
    calories:     { low: 20,   high: 50,   goodImpact: 5,   badImpact: -10 },
    protein:      { low: 1,    high: 5,    goodImpact: 8,   badImpact: -3  },
    fiber:        { low: 0.5,  high: 2,    goodImpact: 5,   badImpact: -3  },
    skip: new Set<NutrientKey>(['protein', 'fiber']),
  },

  // Dairy / yogurt: moderate sugar is expected; protein and fat thresholds shift
  dairy: {
    sugar:        { low: 5,    high: 15,   goodImpact: 8,   badImpact: -10 },
    saturatedFat: { low: 2,    high: 6,    goodImpact: 5,   badImpact: -8  },
    protein:      { low: 3,    high: 10,   goodImpact: 10,  badImpact: -5  },
    skip: new Set<NutrientKey>(['fiber']),
  },
  yogurt: {
    sugar:        { low: 5,    high: 15,   goodImpact: 8,   badImpact: -12 },
    saturatedFat: { low: 1,    high: 4,    goodImpact: 5,   badImpact: -8  },
    protein:      { low: 3,    high: 8,    goodImpact: 10,  badImpact: -5  },
    calories:     { low: 50,   high: 120,  goodImpact: 5,   badImpact: -8  },
    skip: new Set<NutrientKey>(['fiber']),
  },

  // Cheese: naturally high-fat / high-salt — widen thresholds, soften penalties
  cheese: {
    salt:         { low: 0.5,  high: 2,    goodImpact: 3,   badImpact: -6  },
    saturatedFat: { low: 5,    high: 15,   goodImpact: 3,   badImpact: -6  },
    calories:     { low: 200,  high: 400,  goodImpact: 3,   badImpact: -6  },
    protein:      { low: 10,   high: 25,   goodImpact: 8,   badImpact: -3  },
    skip: new Set<NutrientKey>(['fiber', 'sugar']),
  },

  // Meat / fish: high protein expected; fat thresholds shift
  meat: {
    saturatedFat: { low: 2,    high: 8,    goodImpact: 5,   badImpact: -8  },
    calories:     { low: 100,  high: 300,  goodImpact: 3,   badImpact: -8  },
    protein:      { low: 15,   high: 25,   goodImpact: 8,   badImpact: -5  },
    salt:         { low: 0.3,  high: 2,    goodImpact: 3,   badImpact: -8  },
    skip: new Set<NutrientKey>(['fiber', 'sugar']),
  },
  fish: {
    saturatedFat: { low: 1,    high: 5,    goodImpact: 5,   badImpact: -6  },
    calories:     { low: 80,   high: 250,  goodImpact: 3,   badImpact: -6  },
    protein:      { low: 15,   high: 25,   goodImpact: 10,  badImpact: -5  },
    skip: new Set<NutrientKey>(['fiber', 'sugar']),
  },

  // Snacks: calorie-dense by nature — raise thresholds, keep penalties
  snack: {
    sugar:        { low: 5,    high: 20,   goodImpact: 8,   badImpact: -12 },
    salt:         { low: 0.5,  high: 2,    goodImpact: 3,   badImpact: -10 },
    saturatedFat: { low: 3,    high: 10,   goodImpact: 3,   badImpact: -8  },
    calories:     { low: 200,  high: 350,  goodImpact: 3,   badImpact: -8  },
    fiber:        { low: 2,    high: 6,    goodImpact: 8,   badImpact: -3  },
  },

  // Sweets & desserts: sugar is expected — raise threshold, soften penalty
  sweet: {
    sugar:        { low: 15,   high: 40,   goodImpact: 5,   badImpact: -8  },
    saturatedFat: { low: 3,    high: 12,   goodImpact: 3,   badImpact: -6  },
    calories:     { low: 200,  high: 350,  goodImpact: 3,   badImpact: -6  },
    skip: new Set<NutrientKey>(['protein', 'fiber']),
  },
  dessert: {
    sugar:        { low: 15,   high: 40,   goodImpact: 5,   badImpact: -8  },
    saturatedFat: { low: 3,    high: 12,   goodImpact: 3,   badImpact: -6  },
    calories:     { low: 200,  high: 350,  goodImpact: 3,   badImpact: -6  },
    skip: new Set<NutrientKey>(['protein', 'fiber']),
  },

  // Cereal / bread: fiber matters more
  cereal: {
    sugar:        { low: 5,    high: 20,   goodImpact: 8,   badImpact: -12 },
    fiber:        { low: 3,    high: 8,    goodImpact: 10,  badImpact: -8  },
    calories:     { low: 150,  high: 400,  goodImpact: 3,   badImpact: -6  },
  },
  bread: {
    salt:         { low: 0.5,  high: 1.5,  goodImpact: 3,   badImpact: -8  },
    fiber:        { low: 3,    high: 6,    goodImpact: 10,  badImpact: -8  },
    calories:     { low: 200,  high: 350,  goodImpact: 3,   badImpact: -5  },
  },

  // Sauce / condiment: consumed in small portions — raise salt/calorie bar
  sauce: {
    sugar:        { low: 5,    high: 25,   goodImpact: 5,   badImpact: -8  },
    salt:         { low: 1,    high: 4,    goodImpact: 3,   badImpact: -8  },
    calories:     { low: 50,   high: 200,  goodImpact: 3,   badImpact: -5  },
    saturatedFat: { low: 2,    high: 8,    goodImpact: 3,   badImpact: -6  },
    skip: new Set<NutrientKey>(['protein', 'fiber']),
  },

  // Ready meals: compared against a full-meal standard
  ready_meal: {
    salt:         { low: 0.5,  high: 2,    goodImpact: 5,   badImpact: -10 },
    saturatedFat: { low: 2,    high: 7,    goodImpact: 5,   badImpact: -8  },
    calories:     { low: 100,  high: 250,  goodImpact: 5,   badImpact: -8  },
    protein:      { low: 8,    high: 20,   goodImpact: 10,  badImpact: -5  },
    fiber:        { low: 2,    high: 5,    goodImpact: 8,   badImpact: -5  },
  },

  // Plant protein: high protein expected
  plant_protein: {
    protein:      { low: 10,   high: 20,   goodImpact: 10,  badImpact: -8  },
    fiber:        { low: 3,    high: 8,    goodImpact: 8,   badImpact: -5  },
    salt:         { low: 0.5,  high: 2,    goodImpact: 3,   badImpact: -8  },
  },

  // Fruit & vegetables: very healthy baseline
  fruit_vegetable: {
    sugar:        { low: 5,    high: 15,   goodImpact: 5,   badImpact: -8  },
    calories:     { low: 30,   high: 80,   goodImpact: 5,   badImpact: -5  },
    fiber:        { low: 2,    high: 5,    goodImpact: 10,  badImpact: -5  },
    skip: new Set<NutrientKey>(['protein']),
  },
};

const getCategoryProfile = (productType: ProductType | null): CategoryProfile => {
  const overrides = productType ? CATEGORY_PROFILES[productType] : undefined;
  if (!overrides) return DEFAULT_PROFILE;
  return {
    sugar: overrides.sugar ?? DEFAULT_PROFILE.sugar,
    salt: overrides.salt ?? DEFAULT_PROFILE.salt,
    saturatedFat: overrides.saturatedFat ?? DEFAULT_PROFILE.saturatedFat,
    calories: overrides.calories ?? DEFAULT_PROFILE.calories,
    protein: overrides.protein ?? DEFAULT_PROFILE.protein,
    fiber: overrides.fiber ?? DEFAULT_PROFILE.fiber,
    skip: overrides.skip ?? NO_SKIP,
  };
};

const computeNutritionLevel = (value: number | null, low: number, high: number): NutritionLevel => {
  if (value == null) return 'unknown';
  if (value <= low) return 'low';
  if (value >= high) return 'high';
  return 'moderate';
};

const computeNutritionLevels = (n: ProductFacts['nutritionFacts'], cat: CategoryProfile) => ({
  sugarLevel: computeNutritionLevel(n.sugars, cat.sugar.low, cat.sugar.high),
  saltLevel: computeNutritionLevel(n.salt, cat.salt.low, cat.salt.high),
  calorieLevel: computeNutritionLevel(n.calories, cat.calories.low, cat.calories.high),
  proteinLevel: computeNutritionLevel(n.protein, cat.protein.low, cat.protein.high),
  fiberLevel: computeNutritionLevel(n.fiber, cat.fiber.low, cat.fiber.high),
  saturatedFatLevel: computeNutritionLevel(n.saturatedFat, cat.saturatedFat.low, cat.saturatedFat.high),
});

const PRODUCT_TYPE_DESCRIPTIONS: Record<ProductType | 'unknown', string> = {
  beverage: 'beverages',
  dairy: 'dairy products',
  yogurt: 'yogurts',
  cheese: 'cheeses',
  meat: 'meat products',
  fish: 'fish products',
  snack: 'snacks',
  sweet: 'sweets',
  cereal: 'cereals',
  sauce: 'sauces',
  bread: 'bread products',
  ready_meal: 'ready meals',
  plant_protein: 'plant protein products',
  dessert: 'desserts',
  fruit_vegetable: 'fruits and vegetables',
  other: 'products like this',
  unknown: 'products like this',
};

const withProductTypeContext = (description: string, productType: ProductType | null): string => {
  const category = PRODUCT_TYPE_DESCRIPTIONS[productType ?? 'unknown'];
  return `${description} for ${category}`;
};

// ============================================================
// Profile input for scoring
// ============================================================

export interface ScoreProfileInput {
  profileId: string;
  profileType: 'self' | 'family_member';
  name: string;
  onboarding: OnboardingResponse;
}

// ============================================================
// Nutrition scoring rules
// ============================================================

/**
 * @param polarity – which end of the scale is desirable:
 *   'low-is-good'  → sugar, salt, saturated fat, calories
 *   'high-is-good' → protein, fiber
 *
 * Returns a reason for every known level:
 *   high/low → positive or negative with real impact
 *   moderate → neutral with impact 0 (informational, shown but not highlighted)
 */
const nutritionReason = (
  key: string,
  label: string,
  level: NutritionLevel,
  value: number | null,
  unit: string,
  polarity: 'low-is-good' | 'high-is-good',
  goodDesc: string,
  badDesc: string,
  moderateDesc: string,
  goodImpact: number,
  badImpact: number,
  productType: ProductType | null,
): ScoreReason | null => {
  if (level === 'unknown') return null;

  if (level === 'moderate') {
    // Skip if value is 0 or null — nothing meaningful to show
    if (value == null || value === 0) return null;
    return {
      key,
      label,
      description: withProductTypeContext(moderateDesc, productType),
      value,
      unit,
      impact: 0,
      kind: 'neutral',
      source: 'nutrition',
    };
  }

  const isGood =
    (polarity === 'low-is-good' && level === 'low') ||
    (polarity === 'high-is-good' && level === 'high');

  return {
    key,
    label,
    description: withProductTypeContext(isGood ? goodDesc : badDesc, productType),
    value,
    unit,
    impact: isGood ? goodImpact : badImpact,
    kind: isGood ? 'positive' : 'negative',
    source: 'nutrition',
  };
};

/**
 * Create a neutral (informational) reason for a skipped nutrient.
 * Only emits when value is present and non-zero.
 */
const neutralNutritionReason = (
  key: string,
  label: string,
  value: number | null,
  unit: string,
  desc: string,
  productType: ProductType | null,
): ScoreReason | null => {
  if (value == null || value === 0) return null;
  return {
    key,
    label,
    description: withProductTypeContext(desc, productType),
    value,
    unit,
    impact: 0,
    kind: 'neutral',
    source: 'nutrition',
  };
};

const evaluateNutritionFacts = (facts: ProductFacts): ScoreReason[] => {
  const reasons: ScoreReason[] = [];
  const n = facts.nutritionFacts;
  const cat = getCategoryProfile(facts.productType);
  const s = computeNutritionLevels(n, cat);
  const { skip } = cat;

  // --- Evaluated nutrients (scored) ---

  if (!skip.has('sugar')) {
    const sugar = nutritionReason('sugar', 'Sugar', s.sugarLevel, n.sugars, 'g',
      'low-is-good', 'Low sugar content', 'High sugar content', 'Moderate sugar content',
      cat.sugar.goodImpact, cat.sugar.badImpact, facts.productType);
    if (sugar) reasons.push(sugar);
  } else {
    const r = neutralNutritionReason('sugar', 'Sugar', n.sugars, 'g', 'Sugar content', facts.productType);
    if (r) reasons.push(r);
  }

  if (!skip.has('salt')) {
    const salt = nutritionReason('salt', 'Salt', s.saltLevel, n.salt, 'g',
      'low-is-good', 'Low salt content', 'High salt content', 'Moderate salt content',
      cat.salt.goodImpact, cat.salt.badImpact, facts.productType);
    if (salt) reasons.push(salt);
  } else {
    const r = neutralNutritionReason('salt', 'Salt', n.salt, 'g', 'Salt content', facts.productType);
    if (r) reasons.push(r);
  }

  if (!skip.has('saturatedFat')) {
    const satFat = nutritionReason('saturated-fat', 'Saturated fat', s.saturatedFatLevel, n.saturatedFat, 'g',
      'low-is-good', 'Low saturated fat', 'High saturated fat', 'Moderate saturated fat',
      cat.saturatedFat.goodImpact, cat.saturatedFat.badImpact, facts.productType);
    if (satFat) reasons.push(satFat);
  } else {
    const r = neutralNutritionReason(
      'saturated-fat',
      'Saturated fat',
      n.saturatedFat,
      'g',
      'Saturated fat content',
      facts.productType,
    );
    if (r) reasons.push(r);
  }

  if (!skip.has('calories')) {
    const cal = nutritionReason('calories', 'Calories', s.calorieLevel, n.calories, 'kcal',
      'low-is-good', 'Low calorie density', 'High calorie density', 'Moderate calorie density',
      cat.calories.goodImpact, cat.calories.badImpact, facts.productType);
    if (cal) reasons.push(cal);
  } else {
    const r = neutralNutritionReason('calories', 'Calories', n.calories, 'kcal', 'Calorie content', facts.productType);
    if (r) reasons.push(r);
  }

  if (!skip.has('protein')) {
    const protein = nutritionReason('protein', 'Protein', s.proteinLevel, n.protein, 'g',
      'high-is-good', 'High protein content', 'Low protein content', 'Moderate protein content',
      cat.protein.goodImpact, cat.protein.badImpact, facts.productType);
    if (protein) reasons.push(protein);
  } else {
    const r = neutralNutritionReason('protein', 'Protein', n.protein, 'g', 'Protein content', facts.productType);
    if (r) reasons.push(r);
  }

  if (!skip.has('fiber')) {
    const fiber = nutritionReason('fiber', 'Fiber', s.fiberLevel, n.fiber, 'g',
      'high-is-good', 'High fiber content', 'Low fiber content', 'Moderate fiber content',
      cat.fiber.goodImpact, cat.fiber.badImpact, facts.productType);
    if (fiber) reasons.push(fiber);
  } else {
    const r = neutralNutritionReason('fiber', 'Fiber', n.fiber, 'g', 'Fiber content', facts.productType);
    if (r) reasons.push(r);
  }

  // --- Always-neutral nutrients (informational, not scored) ---
  const fat = neutralNutritionReason('fat', 'Fat', n.fat, 'g', 'Total fat content', facts.productType);
  if (fat) reasons.push(fat);

  const carbs = neutralNutritionReason('carbs', 'Carbs', n.carbs, 'g', 'Carbohydrate content', facts.productType);
  if (carbs) reasons.push(carbs);

  return reasons;
};

// ============================================================
// Nutri grade scoring
// ============================================================

const NUTRI_GRADE_IMPACTS: Record<string, { impact: number; kind: 'positive' | 'negative'; desc: string }> = {
  a: { impact: 15, kind: 'positive', desc: 'Excellent Nutri-Score grade (A)' },
  b: { impact: 10, kind: 'positive', desc: 'Good Nutri-Score grade (B)' },
  c: { impact: 0, kind: 'positive', desc: 'Average Nutri-Score grade (C)' },
  d: { impact: -10, kind: 'negative', desc: 'Below-average Nutri-Score grade (D)' },
  e: { impact: -15, kind: 'negative', desc: 'Poor Nutri-Score grade (E)' },
};

const evaluateNutriGrade = (facts: ProductFacts): ScoreReason | null => {
  if (!facts.nutriGrade) return null;
  const entry = NUTRI_GRADE_IMPACTS[facts.nutriGrade];
  if (!entry || entry.impact === 0) return null;

  return {
    key: 'nutri-grade',
    label: 'Nutri-Score',
    description: entry.desc,
    value: null,
    unit: null,
    impact: entry.impact,
    kind: entry.kind,
    source: 'nutrition',
  };
};

// ============================================================
// Diet/restriction scoring
// ============================================================

const RESTRICTION_TO_DIET_KEY: Record<string, keyof ProductFacts['dietCompatibility']> = {
  VEGAN: 'vegan',
  VEGETARIAN: 'vegetarian',
  HALAL: 'halal',
  KOSHER: 'kosher',
  GLUTEN_FREE: 'glutenFree',
  DAIRY_FREE: 'dairyFree',
  NUT_FREE: 'nutFree',
};

const RESTRICTION_LABELS: Record<string, string> = {
  VEGAN: 'Vegan',
  VEGETARIAN: 'Vegetarian',
  HALAL: 'Halal',
  KOSHER: 'Kosher',
  GLUTEN_FREE: 'Gluten-free',
  DAIRY_FREE: 'Dairy-free',
  NUT_FREE: 'Nut-free',
};

const evaluateRestrictions = (
  facts: ProductFacts,
  restrictions: string[],
): ScoreReason[] => {
  const reasons: ScoreReason[] = [];

  for (const restriction of restrictions) {
    const dietKey = RESTRICTION_TO_DIET_KEY[restriction];
    if (!dietKey) continue;

    const compat = facts.dietCompatibility[dietKey];
    const aiReason = facts.dietCompatibilityReasons?.[dietKey];
    const label = RESTRICTION_LABELS[restriction] ?? restriction;
    const key = `restriction-${restriction.toLowerCase()}`;

    if (compat === 'incompatible') {
      const baseDesc = `Product is incompatible with your ${label.toLowerCase()} diet`;
      reasons.push({
        key,
        label: `${label} diet conflict`,
        description: aiReason ? `${baseDesc}. ${aiReason}` : baseDesc,
        value: null,
        unit: null,
        impact: -100,
        kind: 'negative',
        source: 'restriction',
      });
    } else if (compat === 'unclear') {
      const baseDesc = `Cannot confirm ${label.toLowerCase()} compatibility`;
      reasons.push({
        key,
        label: `${label} unclear`,
        description: aiReason ? `${baseDesc}. ${aiReason}` : baseDesc,
        value: null,
        unit: null,
        impact: -1,
        kind: 'negative',
        source: 'restriction',
      });
    } else if (compat === 'compatible') {
      reasons.push({
        key,
        label: `${label} compatible`,
        description: `No conflict with your ${label.toLowerCase()} diet detected`,
        value: null,
        unit: null,
        impact: 5,
        kind: 'positive',
        source: 'restriction',
      });
    }
    // "unclear" → no reason added
  }

  return reasons;
};

// ============================================================
// Allergen scoring
// ============================================================

const ALLERGY_LABELS: Record<string, string> = {
  PEANUTS: 'Peanuts',
  TREE_NUTS: 'Tree nuts',
  GLUTEN: 'Gluten',
  DAIRY: 'Dairy',
  SOY: 'Soy',
  EGGS: 'Eggs',
  SHELLFISH: 'Shellfish',
  SESAME: 'Sesame',
};

const ALLERGY_TO_DIET_KEY: Record<string, keyof ProductFacts['dietCompatibility'] | null> = {
  GLUTEN: 'glutenFree',
  DAIRY: 'dairyFree',
  PEANUTS: 'nutFree',
  TREE_NUTS: 'nutFree',
};

const evaluateAllergens = (
  facts: ProductFacts,
  allergies: string[],
): ScoreReason[] => {
  const reasons: ScoreReason[] = [];

  for (const allergy of allergies) {
    if (allergy === 'OTHER') continue;

    const dietKey = ALLERGY_TO_DIET_KEY[allergy];
    const label = ALLERGY_LABELS[allergy] ?? allergy;
    const key = `allergen-${allergy.toLowerCase()}`;

    if (dietKey) {
      const compat = facts.dietCompatibility[dietKey];
      const aiReason = facts.dietCompatibilityReasons?.[dietKey];
      if (compat === 'incompatible') {
        const baseDesc = `Product may contain ${label.toLowerCase()}, which conflicts with your allergy`;
        reasons.push({
          key,
          label: `${label} allergen conflict`,
          description: aiReason ? `${baseDesc}. ${aiReason}` : baseDesc,
          value: null,
          unit: null,
          impact: -50,
          kind: 'negative',
          source: 'allergen',
        });
      }
    }
  }

  return reasons;
};

/**
 * Use AI ingredient analysis to detect allergen/restriction conflicts
 * that the deterministic diet-key approach can't catch (e.g. custom "OTHER" allergies).
 */
const evaluateIngredientFlags = (
  ingredientAnalysis?: IngredientAnalysis,
): ScoreReason[] => {
  if (!ingredientAnalysis) return [];

  const reasons: ScoreReason[] = [];

  for (const ingredient of ingredientAnalysis.ingredients) {
    if (ingredient.status !== 'bad' || !ingredient.reason) continue;

    const key = `ingredient-flag-${ingredient.name.toLowerCase().replace(/\s+/g, '-')}`;
    reasons.push({
      key,
      label: `${ingredient.name} flagged`,
      description: ingredient.reason,
      value: null,
      unit: null,
      impact: -25,
      kind: 'negative',
      source: 'allergen',
    });
  }

  return reasons;
};

// ============================================================
// Goal-based scoring
// ============================================================

const evaluateGoals = (
  facts: ProductFacts,
  onboarding: OnboardingResponse,
): ScoreReason[] => {
  const reasons: ScoreReason[] = [];
  const n = facts.nutritionFacts;
  const cat = getCategoryProfile(facts.productType);
  const s = computeNutritionLevels(n, cat);

  const goal = onboarding.mainGoal;
  const priorities = onboarding.nutritionPriorities;

  // Weight loss: penalize high calories
  if (goal === 'WEIGHT_LOSS' && s.calorieLevel === 'high') {
    reasons.push({
      key: 'goal-weight-loss-calories',
      label: 'Weight loss goal',
      description: 'High calorie density conflicts with your weight loss goal',
      value: n.calories,
      unit: 'kcal',
      impact: -10,
      kind: 'negative',
      source: 'goal',
    });
  }

  // Muscle gain: reward high protein
  if (goal === 'MUSCLE_GAIN' && s.proteinLevel === 'high') {
    reasons.push({
      key: 'goal-muscle-gain-protein',
      label: 'Muscle gain goal',
      description: 'High protein supports your muscle gain goal',
      value: n.protein,
      unit: 'g',
      impact: 10,
      kind: 'positive',
      source: 'goal',
    });
  }

  // Muscle gain: penalize low protein
  if (goal === 'MUSCLE_GAIN' && s.proteinLevel === 'low') {
    reasons.push({
      key: 'goal-muscle-gain-low-protein',
      label: 'Muscle gain goal',
      description: 'Low protein does not support your muscle gain goal',
      value: n.protein,
      unit: 'g',
      impact: -8,
      kind: 'negative',
      source: 'goal',
    });
  }

  // Diabetes control: penalize high sugar
  if (goal === 'DIABETES_CONTROL' && s.sugarLevel === 'high') {
    reasons.push({
      key: 'goal-diabetes-sugar',
      label: 'Blood sugar management',
      description: 'High sugar content conflicts with your diabetes management goal',
      value: n.sugars,
      unit: 'g',
      impact: -15,
      kind: 'negative',
      source: 'goal',
    });
  }

  // Diabetes control: reward low sugar
  if (goal === 'DIABETES_CONTROL' && s.sugarLevel === 'low') {
    reasons.push({
      key: 'goal-diabetes-low-sugar',
      label: 'Blood sugar management',
      description: 'Low sugar supports your blood sugar management',
      value: n.sugars,
      unit: 'g',
      impact: 10,
      kind: 'positive',
      source: 'goal',
    });
  }

  // Priority: LOW_SUGAR
  if (priorities.includes('LOW_SUGAR')) {
    if (s.sugarLevel === 'low') {
      reasons.push({
        key: 'priority-low-sugar',
        label: 'Low sugar priority',
        description: 'Fits your low sugar preference',
        value: n.sugars,
        unit: 'g',
        impact: 8,
        kind: 'positive',
        source: 'goal',
      });
    } else if (s.sugarLevel === 'high') {
      reasons.push({
        key: 'priority-low-sugar',
        label: 'Low sugar priority',
        description: 'Too high for your low sugar preference',
        value: n.sugars,
        unit: 'g',
        impact: -12,
        kind: 'negative',
        source: 'goal',
      });
    }
  }

  // Priority: LOW_SODIUM
  if (priorities.includes('LOW_SODIUM')) {
    if (s.saltLevel === 'low') {
      reasons.push({
        key: 'priority-low-sodium',
        label: 'Low sodium priority',
        description: 'Fits your low sodium preference',
        value: n.salt,
        unit: 'g',
        impact: 8,
        kind: 'positive',
        source: 'goal',
      });
    } else if (s.saltLevel === 'high') {
      reasons.push({
        key: 'priority-low-sodium',
        label: 'Low sodium priority',
        description: 'Too salty for your low sodium preference',
        value: n.salt,
        unit: 'g',
        impact: -12,
        kind: 'negative',
        source: 'goal',
      });
    }
  }

  // Priority: HIGH_PROTEIN
  if (priorities.includes('HIGH_PROTEIN')) {
    if (s.proteinLevel === 'high') {
      reasons.push({
        key: 'priority-high-protein',
        label: 'High protein priority',
        description: 'Supports your high protein preference',
        value: n.protein,
        unit: 'g',
        impact: 8,
        kind: 'positive',
        source: 'goal',
      });
    } else if (s.proteinLevel === 'low') {
      reasons.push({
        key: 'priority-high-protein',
        label: 'High protein priority',
        description: 'Low protein for your high protein preference',
        value: n.protein,
        unit: 'g',
        impact: -8,
        kind: 'negative',
        source: 'goal',
      });
    }
  }

  // Priority: HIGH_FIBER
  if (priorities.includes('HIGH_FIBER')) {
    if (s.fiberLevel === 'high') {
      reasons.push({
        key: 'priority-high-fiber',
        label: 'High fiber priority',
        description: 'Supports your high fiber preference',
        value: n.fiber,
        unit: 'g',
        impact: 8,
        kind: 'positive',
        source: 'goal',
      });
    } else if (s.fiberLevel === 'low') {
      reasons.push({
        key: 'priority-high-fiber',
        label: 'High fiber priority',
        description: 'Low fiber for your preference',
        value: n.fiber,
        unit: 'g',
        impact: -6,
        kind: 'negative',
        source: 'goal',
      });
    }
  }

  // Priority: LOW_CARB
  if (priorities.includes('LOW_CARB') && n.carbs != null) {
    if (n.carbs <= 10) {
      reasons.push({
        key: 'priority-low-carb',
        label: 'Low carb priority',
        description: 'Low carbohydrate content fits your preference',
        value: n.carbs,
        unit: 'g',
        impact: 8,
        kind: 'positive',
        source: 'goal',
      });
    } else if (n.carbs > 30) {
      reasons.push({
        key: 'priority-low-carb',
        label: 'Low carb priority',
        description: 'High carbohydrate content conflicts with your preference',
        value: n.carbs,
        unit: 'g',
        impact: -10,
        kind: 'negative',
        source: 'goal',
      });
    }
  }

  return reasons;
};

// ============================================================
// Product type scoring
// ============================================================

const evaluateProductType = (
  _facts: ProductFacts,
  _onboarding: OnboardingResponse,
): ScoreReason[] => {
  // Category-aware thresholds & impacts are already applied via
  // getCategoryProfile() in evaluateNutritionFacts and evaluateGoals.
  // No additional product-type penalties needed.
  return [];
};

// ============================================================
// Main score engine
// ============================================================

/**
 * Compute a deterministic score for a single profile given product facts.
 * Same input always gives the same output.
 */
export const computeProfileScore = (
  facts: ProductFacts,
  profile: ScoreProfileInput,
  ingredientAnalysis?: IngredientAnalysis,
): ProfileProductScore => {
  const { onboarding } = profile;

  // Collect all reasons
  const allReasons: ScoreReason[] = [
    ...evaluateNutritionFacts(facts),
    ...evaluateNutriGrade(facts) ? [evaluateNutriGrade(facts)!] : [],
    ...evaluateRestrictions(facts, onboarding.restrictions),
    ...evaluateAllergens(facts, onboarding.allergies),
    ...evaluateIngredientFlags(ingredientAnalysis),
    ...evaluateGoals(facts, onboarding),
    ...evaluateProductType(facts, onboarding),
  ];

  // Build breakdown — only steps with non-zero impact
  const steps: ScoreBreakdownStep[] = [];
  let running = BASE_SCORE;

  for (const r of allReasons) {
    if (r.impact === 0) continue;
    running += r.impact;
    steps.push({
      rule: `${r.source}:${r.key}`,
      label: r.description,
      impact: r.impact,
      running,
    });
  }

  const totalImpact = running - BASE_SCORE;
  const rawScore = running;
  const score = clamp(rawScore);

  const scoreBreakdown: ScoreBreakdown = {
    baseScore: BASE_SCORE,
    steps,
    totalImpact,
    rawScore,
    finalScore: score,
  };

  // Separate positives, negatives, and neutrals
  // Neutral items are appended to positives (informational, shown but not highlighted)
  const positives = allReasons.filter((r) => r.kind === 'positive' || r.kind === 'neutral');
  const negatives = allReasons.filter((r) => r.kind === 'negative');

  return {
    profileId: profile.profileId,
    profileType: profile.profileType,
    name: profile.name,
    score,
    fitLabel: getFitLabel(score),
    positives,
    negatives,
    scoreBreakdown,
    ...(ingredientAnalysis ? { ingredientAnalysis } : {}),
  };
};

/**
 * Compute scores for multiple profiles against the same product facts.
 * Accepts a per-profile ingredient analysis map for profile-specific highlighting.
 */
export const computeAllProfileScores = (
  facts: ProductFacts,
  profiles: ScoreProfileInput[],
  perProfileIngredients?: Map<string, IngredientAnalysis | null>,
): ProfileProductScore[] => {
  return profiles.map((profile) => {
    const analysis = perProfileIngredients?.get(profile.profileId) ?? undefined;
    return computeProfileScore(facts, profile, analysis ?? undefined);
  });
};
