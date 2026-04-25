import type {
  NormalizedProduct,
  ProductFacts,
  ScoreReason,
  ScoreReasonCategory,
  FitLabel,
  ProfileProductScore,
  NutritionLevel,
  ProductType,
  ScoreBreakdown,
  ScoreBreakdownStep,
  IngredientAnalysis,
} from '@acme/shared';
import {
  GOOD_FIT_SCORE_MIN,
  GREAT_FIT_SCORE_MIN,
  NEUTRAL_FIT_SCORE_MIN,
} from '@acme/shared';
import type { OnboardingResponse } from '@acme/shared';

// ============================================================
// Score constants
// ============================================================

const BASE_SCORE = 55;
const MAX_SCORE = 100;
const MIN_SCORE = 0;

const clamp = (score: number): number =>
  Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));

const getFitLabel = (score: number): FitLabel => {
  if (score >= GREAT_FIT_SCORE_MIN) return 'great_fit';
  if (score >= GOOD_FIT_SCORE_MIN) return 'good_fit';
  if (score >= NEUTRAL_FIT_SCORE_MIN) return 'neutral';
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

type NutrientKey =
  | 'sugar'
  | 'salt'
  | 'saturatedFat'
  | 'calories'
  | 'protein'
  | 'fiber';

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

const NO_SKIP = new Set<NutrientKey>();

const DEFAULT_PROFILE: CategoryProfile = {
  sugar: { low: 5, high: 12.5, goodImpact: 10, badImpact: -15 },
  salt: { low: 0.3, high: 1.5, goodImpact: 5, badImpact: -10 },
  saturatedFat: { low: 1.5, high: 5, goodImpact: 5, badImpact: -10 },
  calories: { low: 100, high: 250, goodImpact: 5, badImpact: -10 },
  protein: { low: 5, high: 15, goodImpact: 10, badImpact: -5 },
  fiber: { low: 1.5, high: 5, goodImpact: 8, badImpact: -5 },
  skip: NO_SKIP,
};

const CATEGORY_PROFILES: Partial<
  Record<ProductType, Partial<CategoryProfile>>
> = {
  // Beverages: very strict — even moderate values are notable
  beverage: {
    sugar: { low: 2.5, high: 8, goodImpact: 8, badImpact: -15 },
    salt: { low: 0.1, high: 0.5, goodImpact: 0, badImpact: -8 },
    saturatedFat: { low: 0.5, high: 2, goodImpact: 0, badImpact: -8 },
    calories: { low: 20, high: 50, goodImpact: 2, badImpact: -10 },
    protein: { low: 1, high: 5, goodImpact: 0, badImpact: -3 },
    fiber: { low: 0.5, high: 2, goodImpact: 0, badImpact: -3 },
    skip: new Set<NutrientKey>(['protein', 'fiber']),
  },

  // Dairy / yogurt: moderate sugar is expected; protein and fat thresholds shift
  dairy: {
    sugar: { low: 5, high: 15, goodImpact: 8, badImpact: -10 },
    saturatedFat: { low: 2, high: 6, goodImpact: 5, badImpact: -8 },
    protein: { low: 3, high: 10, goodImpact: 10, badImpact: -5 },
    skip: new Set<NutrientKey>(['fiber']),
  },
  yogurt: {
    sugar: { low: 5, high: 15, goodImpact: 8, badImpact: -12 },
    saturatedFat: { low: 1, high: 4, goodImpact: 5, badImpact: -8 },
    protein: { low: 3, high: 8, goodImpact: 10, badImpact: -5 },
    calories: { low: 50, high: 120, goodImpact: 5, badImpact: -8 },
    skip: new Set<NutrientKey>(['fiber']),
  },

  // Cheese: naturally high-fat / high-salt — widen thresholds, soften penalties
  cheese: {
    salt: { low: 0.5, high: 2, goodImpact: 3, badImpact: -6 },
    saturatedFat: { low: 5, high: 15, goodImpact: 3, badImpact: -6 },
    calories: { low: 200, high: 400, goodImpact: 3, badImpact: -6 },
    protein: { low: 10, high: 25, goodImpact: 8, badImpact: -3 },
    skip: new Set<NutrientKey>(['fiber', 'sugar']),
  },

  // Meat / fish: high protein expected; fat thresholds shift
  meat: {
    saturatedFat: { low: 2, high: 8, goodImpact: 5, badImpact: -8 },
    calories: { low: 100, high: 300, goodImpact: 3, badImpact: -8 },
    protein: { low: 15, high: 25, goodImpact: 8, badImpact: -5 },
    salt: { low: 0.3, high: 2, goodImpact: 3, badImpact: -8 },
    skip: new Set<NutrientKey>(['fiber', 'sugar']),
  },
  fish: {
    saturatedFat: { low: 1, high: 5, goodImpact: 5, badImpact: -6 },
    calories: { low: 80, high: 250, goodImpact: 3, badImpact: -6 },
    protein: { low: 15, high: 25, goodImpact: 10, badImpact: -5 },
    skip: new Set<NutrientKey>(['fiber', 'sugar']),
  },

  // Snacks: calorie-dense by nature — raise thresholds, keep penalties
  snack: {
    sugar: { low: 5, high: 10, goodImpact: 0, badImpact: -14 },
    salt: { low: 0.5, high: 2, goodImpact: 0, badImpact: -12 },
    saturatedFat: { low: 3, high: 10, goodImpact: 0, badImpact: -10 },
    calories: { low: 200, high: 350, goodImpact: 0, badImpact: -12 },
    fiber: { low: 2, high: 6, goodImpact: 6, badImpact: -3 },
  },

  // Sweets & desserts: sugar is expected — raise threshold, soften penalty
  sweet: {
    sugar: { low: 15, high: 40, goodImpact: 0, badImpact: -12 },
    saturatedFat: { low: 3, high: 12, goodImpact: 0, badImpact: -8 },
    calories: { low: 200, high: 350, goodImpact: 0, badImpact: -8 },
    skip: new Set<NutrientKey>(['protein', 'fiber']),
  },
  dessert: {
    sugar: { low: 15, high: 40, goodImpact: 0, badImpact: -12 },
    saturatedFat: { low: 3, high: 12, goodImpact: 0, badImpact: -8 },
    calories: { low: 200, high: 350, goodImpact: 0, badImpact: -8 },
    skip: new Set<NutrientKey>(['protein', 'fiber']),
  },

  // Cereal / bread: fiber matters more
  cereal: {
    sugar: { low: 5, high: 20, goodImpact: 8, badImpact: -12 },
    fiber: { low: 3, high: 8, goodImpact: 10, badImpact: -8 },
    calories: { low: 150, high: 400, goodImpact: 3, badImpact: -6 },
  },
  bread: {
    salt: { low: 0.5, high: 1.5, goodImpact: 3, badImpact: -8 },
    fiber: { low: 3, high: 6, goodImpact: 10, badImpact: -8 },
    calories: { low: 200, high: 350, goodImpact: 3, badImpact: -5 },
  },

  // Sauce / condiment: consumed in small portions — raise salt/calorie bar
  sauce: {
    sugar: { low: 5, high: 25, goodImpact: 0, badImpact: -10 },
    salt: { low: 1, high: 4, goodImpact: 0, badImpact: -10 },
    calories: { low: 50, high: 200, goodImpact: 0, badImpact: -8 },
    saturatedFat: { low: 2, high: 8, goodImpact: 0, badImpact: -8 },
    skip: new Set<NutrientKey>(['protein', 'fiber']),
  },

  // Ready meals: compared against a full-meal standard
  ready_meal: {
    salt: { low: 0.5, high: 2, goodImpact: 5, badImpact: -10 },
    saturatedFat: { low: 2, high: 7, goodImpact: 5, badImpact: -8 },
    calories: { low: 100, high: 250, goodImpact: 5, badImpact: -8 },
    protein: { low: 8, high: 20, goodImpact: 10, badImpact: -5 },
    fiber: { low: 2, high: 5, goodImpact: 8, badImpact: -5 },
  },

  // Plant protein: high protein expected
  plant_protein: {
    protein: { low: 10, high: 20, goodImpact: 10, badImpact: -8 },
    fiber: { low: 3, high: 8, goodImpact: 8, badImpact: -5 },
    salt: { low: 0.5, high: 2, goodImpact: 3, badImpact: -8 },
  },

  // Fruit & vegetables: very healthy baseline
  fruit_vegetable: {
    sugar: { low: 5, high: 15, goodImpact: 5, badImpact: -8 },
    calories: { low: 30, high: 80, goodImpact: 5, badImpact: -5 },
    fiber: { low: 2, high: 5, goodImpact: 10, badImpact: -5 },
    skip: new Set<NutrientKey>(['protein']),
  },
};

const getCategoryProfile = (
  productType: ProductType | null,
): CategoryProfile => {
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

const computeNutritionLevel = (
  value: number | null,
  low: number,
  high: number,
): NutritionLevel => {
  if (value == null) return 'unknown';
  if (value <= low) return 'low';
  if (value >= high) return 'high';
  return 'moderate';
};

const computeNutritionLevels = (
  n: ProductFacts['nutritionFacts'],
  cat: CategoryProfile,
) => ({
  sugarLevel: computeNutritionLevel(n.sugars, cat.sugar.low, cat.sugar.high),
  saltLevel: computeNutritionLevel(n.salt, cat.salt.low, cat.salt.high),
  calorieLevel: computeNutritionLevel(
    n.calories,
    cat.calories.low,
    cat.calories.high,
  ),
  proteinLevel: computeNutritionLevel(
    n.protein,
    cat.protein.low,
    cat.protein.high,
  ),
  fiberLevel: computeNutritionLevel(n.fiber, cat.fiber.low, cat.fiber.high),
  saturatedFatLevel: computeNutritionLevel(
    n.saturatedFat,
    cat.saturatedFat.low,
    cat.saturatedFat.high,
  ),
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

const withProductTypeContext = (
  description: string,
  productType: ProductType | null,
): string => {
  const category = PRODUCT_TYPE_DESCRIPTIONS[productType ?? 'unknown'];
  return `${description} for ${category}`;
};

const SCORE_REASON_CATEGORY_LABELS: Record<ScoreReasonCategory, string> = {
  additives: 'Additives',
  allergens: 'Allergens',
  calories: 'Calories',
  carbohydrates: 'Carbohydrates',
  'diet-matching': 'Diet matching',
  fat: 'Fat',
  fiber: 'Fiber',
  protein: 'Protein',
  salt: 'Salt',
  'saturated-fat': 'Saturated fat',
  sugar: 'Sugar',
};

type InternalScoreReason = Omit<ScoreReason, 'category'> & {
  category?: ScoreReasonCategory;
  displayGroupKey?: string;
  hidden?: boolean;
  restrictionDisplayState?: 'conflict' | 'unclear' | 'match';
  restrictionLabel?: string;
  restrictionDetail?: string | null;
  restrictionFactValues?: string[];
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeMatchText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const matchesAnyToken = (text: string, tokens: string[]): boolean => {
  const normalizedText = normalizeMatchText(text);
  if (!normalizedText) return false;

  return tokens.some((token) => {
    const normalizedToken = normalizeMatchText(token);
    if (!normalizedToken) return false;

    const pattern = new RegExp(
      `\\b${escapeRegExp(normalizedToken).replace(/\s+/g, '\\s+')}s?\\b`,
      'i',
    );

    return pattern.test(normalizedText);
  });
};

const uniqueValues = (values: Array<string | null | undefined>): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;

    const normalized = normalizeMatchText(trimmed);
    if (!normalized || seen.has(normalized)) continue;

    seen.add(normalized);
    result.push(trimmed);
  }

  return result;
};

const formatFactList = (values: string[]): string => {
  return uniqueValues(values)
    .map((value) => value.toLowerCase())
    .join(', ');
};

const buildContainsDescription = (values: string[]): string | null => {
  const formatted = formatFactList(values);
  return formatted ? `Contains ${formatted}` : null;
};

const trimSentence = (value: string): string => {
  return value.trim().replace(/\.+$/, '');
};

const joinDescriptions = (
  descriptions: Array<string | null | undefined>,
): string => {
  return uniqueValues(
    descriptions.map((description) =>
      description ? trimSentence(description) : description,
    ),
  ).join('. ');
};

const formatLabelList = (values: string[]): string => {
  return uniqueValues(values)
    .map((value) => value.toLowerCase())
    .join(', ');
};

const splitFactValues = (value: string): string[] => {
  return uniqueValues(
    value
      .split(/\s*(?:,|;)\s*|\s+(?:and|or)\s+/i)
      .map((item) => item.trim()),
  );
};

const extractContainedFactValues = (
  description: string | null | undefined,
): string[] => {
  const trimmed = description ? trimSentence(description) : '';
  const match = trimmed.match(/^contains\s+(.+)$/i);

  if (!match) {
    return [];
  }

  return splitFactValues(match[1]);
};

const buildRestrictionGroupDescription = (
  group: InternalScoreReason[],
): string => {
  const conflictLabels = uniqueValues(
    group
      .filter((reason) => reason.restrictionDisplayState === 'conflict')
      .map((reason) => reason.restrictionLabel ?? reason.label),
  );
  const unclearLabels = uniqueValues(
    group
      .filter((reason) => reason.restrictionDisplayState === 'unclear')
      .map((reason) => reason.restrictionLabel ?? reason.label),
  );
  const matchLabels = uniqueValues(
    group
      .filter((reason) => reason.restrictionDisplayState === 'match')
      .map((reason) => reason.restrictionLabel ?? reason.label),
  );
  const factValues = uniqueValues([
    ...group.flatMap((reason) =>
      extractContainedFactValues(reason.restrictionDetail),
    ),
    ...group.flatMap((reason) => reason.restrictionFactValues ?? []),
  ]);
  const fallbackDetailReasons = uniqueValues(
    group.flatMap((reason) => {
      if (
        !reason.restrictionDetail ||
        extractContainedFactValues(reason.restrictionDetail).length > 0
      ) {
        return [];
      }

      return [reason.restrictionDetail];
    }),
  );

  const descriptions: Array<string | null | undefined> = [];

  if (conflictLabels.length > 0) {
    descriptions.push(
      `Conflicts with your diet (${formatLabelList(conflictLabels)})`,
    );
  }

  if (unclearLabels.length > 0) {
    descriptions.push(
      `Cannot confirm compatibility with your diet (${formatLabelList(
        unclearLabels,
      )})`,
    );
  }

  if (matchLabels.length > 0) {
    descriptions.push(`Matches your diet (${formatLabelList(matchLabels)})`);
  }

  if (factValues.length > 0) {
    descriptions.push(`Contains ${formatFactList(factValues)}`);
  }

  descriptions.push(...fallbackDetailReasons);

  return joinDescriptions(descriptions) || joinDescriptions(group.map((reason) => reason.description));
};

const buildRestrictionGroupShortDescription = (
  group: InternalScoreReason[],
): string => {
  if (group.some((reason) => reason.restrictionDisplayState === 'conflict')) {
    return 'Conflicts with your diet';
  }

  if (group.some((reason) => reason.restrictionDisplayState === 'unclear')) {
    return 'Diet compatibility unclear';
  }

  if (group.some((reason) => reason.restrictionDisplayState === 'match')) {
    return 'Matches your diet';
  }

  return 'Diet matching';
};

const buildDisplayReasonShortDescription = (
  group: InternalScoreReason[],
  category: ScoreReasonCategory,
  dominantReason: InternalScoreReason,
): string => {
  const explicitShortDescription = uniqueValues(
    group.map((reason) => reason.shortDescription),
  )[0];

  if (explicitShortDescription) {
    return explicitShortDescription;
  }

  if (category === 'diet-matching' && group.some((reason) => reason.source === 'restriction')) {
    return buildRestrictionGroupShortDescription(group);
  }

  switch (category) {
    case 'additives':
      return 'Contains additives';
    case 'allergens':
      return dominantReason.kind === 'negative' ? 'Contains your allergens' : 'Allergen-friendly';
    case 'calories':
      return dominantReason.kind === 'negative' ? 'High calorie density' : 'Low calorie density';
    case 'carbohydrates':
      return dominantReason.kind === 'negative' ? 'High carbs' : 'Low carbs';
    case 'diet-matching':
      return dominantReason.kind === 'negative' ? 'Diet mismatch' : 'Diet-friendly';
    case 'fat':
      return dominantReason.kind === 'negative' ? 'High fat' : 'Lower fat';
    case 'fiber':
      return dominantReason.kind === 'negative' ? 'Low fiber' : 'High fiber';
    case 'protein':
      return dominantReason.kind === 'negative' ? 'Low protein' : 'High protein';
    case 'salt':
      return dominantReason.kind === 'negative' ? 'High salt' : 'Low salt';
    case 'saturated-fat':
      return dominantReason.kind === 'negative' ? 'High saturated fat' : 'Low saturated fat';
    case 'sugar':
      return dominantReason.kind === 'negative' ? 'High sugar' : 'Low sugar';
  }
};

const buildDisplayReasons = (
  reasons: InternalScoreReason[],
  kinds: Array<ScoreReason['kind']>,
): ScoreReason[] => {
  const grouped = new Map<string, InternalScoreReason[]>();

  for (const reason of reasons) {
    if (reason.hidden || !reason.category || !kinds.includes(reason.kind)) {
      continue;
    }

    const groupKey = reason.displayGroupKey ?? reason.category;
    const existing = grouped.get(groupKey);

    if (existing) {
      existing.push(reason);
      continue;
    }

    grouped.set(groupKey, [reason]);
  }

  return Array.from(grouped.values()).map((group) => {
    const first = group[0];
    const category = first.category as ScoreReasonCategory;
    const dominantReason = group.reduce((best, current) => {
      const bestPriority =
        best.kind === 'negative' ? 3 : best.kind === 'positive' ? 2 : 1;
      const currentPriority =
        current.kind === 'negative' ? 3 : current.kind === 'positive' ? 2 : 1;

      if (currentPriority !== bestPriority) {
        return currentPriority > bestPriority ? current : best;
      }

      return Math.abs(current.impact) > Math.abs(best.impact) ? current : best;
    });
    const valueReason =
      group.find((reason) => reason.value != null && reason.key === dominantReason.key) ??
      group.find((reason) => reason.value != null);
    const description =
      category === 'diet-matching' &&
      group.some((reason) => reason.source === 'restriction')
        ? buildRestrictionGroupDescription(group)
        : joinDescriptions(group.map((reason) => reason.description));
    const shortDescription = buildDisplayReasonShortDescription(
      group,
      category,
      dominantReason,
    );

    return {
      key: first.displayGroupKey ?? first.key,
      label: SCORE_REASON_CATEGORY_LABELS[category],
      description,
      shortDescription,
      value: valueReason?.value ?? null,
      unit: valueReason?.unit ?? null,
      impact: group.reduce((sum, reason) => sum + reason.impact, 0),
      kind: dominantReason.kind,
      source: dominantReason.source,
      category,
    };
  });
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
  category?: ScoreReasonCategory,
): InternalScoreReason | null => {
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
      ...(category
        ? { category, displayGroupKey: category }
        : { hidden: true }),
    };
  }

  const isGood =
    (polarity === 'low-is-good' && level === 'low') ||
    (polarity === 'high-is-good' && level === 'high');

  return {
    key,
    label,
    description: withProductTypeContext(
      isGood ? goodDesc : badDesc,
      productType,
    ),
    value,
    unit,
    impact: isGood ? goodImpact : badImpact,
    kind: isGood ? 'positive' : 'negative',
    source: 'nutrition',
    ...(category
      ? { category, displayGroupKey: category }
      : { hidden: true }),
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
  category?: ScoreReasonCategory,
): InternalScoreReason | null => {
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
    ...(category
      ? { category, displayGroupKey: category }
      : { hidden: true }),
  };
};

const evaluateNutritionFacts = (facts: ProductFacts): InternalScoreReason[] => {
  const reasons: InternalScoreReason[] = [];
  const n = facts.nutritionFacts;
  const cat = getCategoryProfile(facts.productType);
  const s = computeNutritionLevels(n, cat);
  const { skip } = cat;

  // --- Evaluated nutrients (scored) ---

  if (!skip.has('sugar')) {
    const sugar = nutritionReason(
      'sugar',
      'Sugar',
      s.sugarLevel,
      n.sugars,
      'g',
      'low-is-good',
      'Low sugar content',
      'High sugar content',
      'Moderate sugar content',
      cat.sugar.goodImpact,
      cat.sugar.badImpact,
      facts.productType,
      'sugar',
    );
    if (sugar) reasons.push(sugar);
  } else {
    const r = neutralNutritionReason(
      'sugar',
      'Sugar',
      n.sugars,
      'g',
      'Sugar content',
      facts.productType,
      'sugar',
    );
    if (r) reasons.push(r);
  }

  if (!skip.has('salt')) {
    const salt = nutritionReason(
      'salt',
      'Salt',
      s.saltLevel,
      n.salt,
      'g',
      'low-is-good',
      'Low salt content',
      'High salt content',
      'Moderate salt content',
      cat.salt.goodImpact,
      cat.salt.badImpact,
      facts.productType,
      'salt',
    );
    if (salt) reasons.push(salt);
  } else {
    const r = neutralNutritionReason(
      'salt',
      'Salt',
      n.salt,
      'g',
      'Salt content',
      facts.productType,
      'salt',
    );
    if (r) reasons.push(r);
  }

  if (!skip.has('saturatedFat')) {
    const satFat = nutritionReason(
      'saturated-fat',
      'Saturated fat',
      s.saturatedFatLevel,
      n.saturatedFat,
      'g',
      'low-is-good',
      'Low saturated fat',
      'High saturated fat',
      'Moderate saturated fat',
      cat.saturatedFat.goodImpact,
      cat.saturatedFat.badImpact,
      facts.productType,
      'saturated-fat',
    );
    if (satFat) reasons.push(satFat);
  } else {
    const r = neutralNutritionReason(
      'saturated-fat',
      'Saturated fat',
      n.saturatedFat,
      'g',
      'Saturated fat content',
      facts.productType,
      'saturated-fat',
    );
    if (r) reasons.push(r);
  }

  if (!skip.has('calories')) {
    const cal = nutritionReason(
      'calories',
      'Calories',
      s.calorieLevel,
      n.calories,
      'kcal',
      'low-is-good',
      'Low calorie density',
      'High calorie density',
      'Moderate calorie density',
      cat.calories.goodImpact,
      cat.calories.badImpact,
      facts.productType,
      'calories',
    );
    if (cal) reasons.push(cal);
  } else {
    const r = neutralNutritionReason(
      'calories',
      'Calories',
      n.calories,
      'kcal',
      'Calorie content',
      facts.productType,
      'calories',
    );
    if (r) reasons.push(r);
  }

  if (!skip.has('protein')) {
    const protein = nutritionReason(
      'protein',
      'Protein',
      s.proteinLevel,
      n.protein,
      'g',
      'high-is-good',
      'High protein content',
      'Low protein content',
      'Moderate protein content',
      cat.protein.goodImpact,
      cat.protein.badImpact,
      facts.productType,
      'protein',
    );
    if (protein) reasons.push(protein);
  } else {
    const r = neutralNutritionReason(
      'protein',
      'Protein',
      n.protein,
      'g',
      'Protein content',
      facts.productType,
      'protein',
    );
    if (r) reasons.push(r);
  }

  if (!skip.has('fiber')) {
    const fiber = nutritionReason(
      'fiber',
      'Fiber',
      s.fiberLevel,
      n.fiber,
      'g',
      'high-is-good',
      'High fiber content',
      'Low fiber content',
      'Moderate fiber content',
      cat.fiber.goodImpact,
      cat.fiber.badImpact,
      facts.productType,
    );
    if (fiber) reasons.push(fiber);
  } else {
    const r = neutralNutritionReason(
      'fiber',
      'Fiber',
      n.fiber,
      'g',
      'Fiber content',
      facts.productType,
    );
    if (r) reasons.push(r);
  }

  // --- Always-neutral nutrients (informational, not scored) ---
  const fat = neutralNutritionReason(
    'fat',
    'Fat',
    n.fat,
    'g',
    'Total fat content',
    facts.productType,
    'fat',
  );
  if (fat) reasons.push(fat);

  const carbs = neutralNutritionReason(
    'carbs',
    'Carbohydrates',
    n.carbs,
    'g',
    'Carbohydrate content',
    facts.productType,
    'carbohydrates',
  );
  if (carbs) reasons.push(carbs);

  return reasons;
};

// ============================================================
// Nutri grade scoring
// ============================================================

const NUTRI_GRADE_IMPACTS: Record<
  string,
  { impact: number; kind: 'positive' | 'negative'; desc: string }
> = {
  a: { impact: 15, kind: 'positive', desc: 'Excellent Nutri-Score grade (A)' },
  b: { impact: 10, kind: 'positive', desc: 'Good Nutri-Score grade (B)' },
  c: { impact: 0, kind: 'positive', desc: 'Average Nutri-Score grade (C)' },
  d: {
    impact: -10,
    kind: 'negative',
    desc: 'Below-average Nutri-Score grade (D)',
  },
  e: { impact: -15, kind: 'negative', desc: 'Poor Nutri-Score grade (E)' },
};

const evaluateNutriGrade = (facts: ProductFacts): InternalScoreReason | null => {
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
    hidden: true,
  };
};

// ============================================================
// Diet/restriction scoring
// ============================================================

const RESTRICTION_TO_DIET_KEY: Record<
  string,
  keyof ProductFacts['dietCompatibility']
> = {
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
  KETO: 'Keto',
  PALEO: 'Paleo',
  GLUTEN_FREE: 'Gluten-free',
  DAIRY_FREE: 'Dairy-free',
  NUT_FREE: 'Nut-free',
};

const RESTRICTION_REASON_TOKENS: Record<string, string[]> = {
  VEGAN: ['vegan'],
  VEGETARIAN: ['vegetarian'],
  HALAL: ['halal'],
  KOSHER: ['kosher'],
  KETO: ['keto'],
  PALEO: ['paleo'],
  GLUTEN_FREE: ['gluten free', 'gluten-free', 'gluten'],
  DAIRY_FREE: ['dairy free', 'dairy-free', 'dairy'],
  NUT_FREE: ['nut free', 'nut-free', 'nut'],
};

const RESTRICTION_CONFLICT_TOKENS: Partial<Record<string, string[]>> = {
  VEGAN: [
    'meat',
    'beef',
    'chicken',
    'pork',
    'fish',
    'tuna',
    'salmon',
    'shellfish',
    'shrimp',
    'dairy',
    'milk',
    'whey',
    'butter',
    'cheese',
    'cream',
    'yogurt',
    'egg',
    'honey',
    'gelatin',
    'lard',
    'tallow',
    'bacon',
    'ham',
    'sausage',
    'turkey',
    'lamb',
    'duck',
    'collagen',
    'casein',
    'lactose',
  ],
  VEGETARIAN: [
    'meat',
    'beef',
    'chicken',
    'pork',
    'fish',
    'tuna',
    'salmon',
    'shellfish',
    'shrimp',
    'gelatin',
    'lard',
    'tallow',
    'bacon',
    'ham',
    'sausage',
    'turkey',
    'lamb',
    'duck',
    'collagen',
    'carmine',
  ],
  HALAL: [
    'pork',
    'bacon',
    'ham',
    'lard',
    'gelatin',
    'wine',
    'beer',
    'rum',
    'alcohol',
    'sausage',
    'salami',
    'prosciutto',
  ],
  KOSHER: [
    'pork',
    'bacon',
    'ham',
    'shellfish',
    'shrimp',
    'crab',
    'lobster',
    'lard',
    'sausage',
    'salami',
    'prosciutto',
  ],
  GLUTEN_FREE: [
    'wheat',
    'barley',
    'rye',
    'spelt',
    'semolina',
    'bulgur',
    'malt',
    'seitan',
    'farro',
    'durum',
    'gluten',
  ],
  DAIRY_FREE: [
    'milk',
    'cream',
    'butter',
    'cheese',
    'yogurt',
    'whey',
    'casein',
    'lactose',
    'dairy',
  ],
  NUT_FREE: [
    'peanut',
    'almond',
    'walnut',
    'cashew',
    'hazelnut',
    'pistachio',
    'macadamia',
    'pecan',
    'tree nut',
    'nut',
  ],
};

const collectBadIngredientNames = (
  ingredientAnalysis: IngredientAnalysis | undefined,
  matcher: (ingredient: IngredientAnalysis['ingredients'][number]) => boolean,
): string[] => {
  if (!ingredientAnalysis) return [];

  return uniqueValues(
    ingredientAnalysis.ingredients
      .filter((ingredient) => ingredient.status === 'bad' && matcher(ingredient))
      .map((ingredient) => ingredient.name),
  );
};

const ingredientMatchesRestriction = (
  restriction: string,
  ingredient: IngredientAnalysis['ingredients'][number],
): boolean => {
  const haystack = `${ingredient.name} ${ingredient.reason ?? ''}`;
  const reasonTokens = RESTRICTION_REASON_TOKENS[restriction] ?? [];
  const conflictTokens = RESTRICTION_CONFLICT_TOKENS[restriction] ?? [];

  return (
    matchesAnyToken(haystack, reasonTokens) ||
    matchesAnyToken(ingredient.name, conflictTokens)
  );
};

const buildRestrictionConflictDescription = (
  label: string,
  aiReason: string | null | undefined,
  ingredientNames: string[],
): string => {
  return joinDescriptions([
    `Conflicts with your ${label.toLowerCase()} restriction`,
    aiReason,
    buildContainsDescription(ingredientNames),
  ]);
};

const buildRestrictionUnclearDescription = (
  label: string,
  aiReason: string | null | undefined,
): string => {
  return joinDescriptions([
    `Cannot confirm ${label.toLowerCase()} compatibility`,
    aiReason,
  ]);
};

const evaluateRestrictions = (
  facts: ProductFacts,
  onboarding: OnboardingResponse,
  ingredientAnalysis?: IngredientAnalysis,
): InternalScoreReason[] => {
  const reasons: InternalScoreReason[] = [];
  const displayGroupKey = 'diet-matching';

  for (const restriction of onboarding.restrictions) {
    const dietKey = RESTRICTION_TO_DIET_KEY[restriction];
    const label = RESTRICTION_LABELS[restriction] ?? restriction;
    const key = `restriction-${restriction.toLowerCase()}`;

    const compat = dietKey ? facts.dietCompatibility[dietKey] : null;
    const aiReason = dietKey ? facts.dietCompatibilityReasons?.[dietKey] : null;
    const ingredientNames = collectBadIngredientNames(
      ingredientAnalysis,
      (ingredient) => ingredientMatchesRestriction(restriction, ingredient),
    );

    if (compat === 'incompatible' || ingredientNames.length > 0) {
      reasons.push({
        key,
        label: label,
        description: buildRestrictionConflictDescription(
          label,
          aiReason,
          ingredientNames,
        ),
        value: null,
        unit: null,
        impact: -100,
        kind: 'negative',
        source: 'restriction',
        category: 'diet-matching',
        displayGroupKey,
        restrictionDisplayState: 'conflict',
        restrictionLabel: label,
        restrictionDetail: aiReason,
        restrictionFactValues: ingredientNames,
      });
    } else if (compat === 'unclear') {
      reasons.push({
        key,
        label: label,
        description: buildRestrictionUnclearDescription(label, aiReason),
        value: null,
        unit: null,
        impact: -1,
        kind: 'negative',
        source: 'restriction',
        category: 'diet-matching',
        displayGroupKey,
        restrictionDisplayState: 'unclear',
        restrictionLabel: label,
        restrictionDetail: aiReason,
      });
    } else if (compat === 'compatible') {
      reasons.push({
        key,
        label: label,
        description: `Matches your ${label.toLowerCase()} restriction`,
        value: null,
        unit: null,
        impact: 5,
        kind: 'positive',
        source: 'restriction',
        category: 'diet-matching',
        displayGroupKey,
        restrictionDisplayState: 'match',
        restrictionLabel: label,
      });
    }
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

const ALLERGY_TO_DIET_KEY: Record<
  string,
  keyof ProductFacts['dietCompatibility'] | null
> = {
  GLUTEN: 'glutenFree',
  DAIRY: 'dairyFree',
  PEANUTS: 'nutFree',
  TREE_NUTS: 'nutFree',
};

const ALLERGY_CONFLICT_TOKENS: Record<string, string[]> = {
  PEANUTS: ['peanut'],
  TREE_NUTS: [
    'almond',
    'walnut',
    'cashew',
    'hazelnut',
    'pistachio',
    'macadamia',
    'pecan',
    'tree nut',
    'nut',
  ],
  GLUTEN: [
    'wheat',
    'barley',
    'rye',
    'spelt',
    'semolina',
    'bulgur',
    'malt',
    'seitan',
    'farro',
    'durum',
    'gluten',
  ],
  DAIRY: [
    'milk',
    'cream',
    'butter',
    'cheese',
    'yogurt',
    'whey',
    'casein',
    'lactose',
    'dairy',
  ],
  SOY: ['soy'],
  EGGS: ['egg'],
  SHELLFISH: ['shellfish', 'shrimp', 'crab', 'lobster'],
  SESAME: ['sesame'],
};

const collectMatchingProductValues = (
  values: string[],
  tokens: string[],
): string[] => {
  return uniqueValues(values.filter((value) => matchesAnyToken(value, tokens)));
};

const ingredientMatchesAllergy = (
  allergy: string,
  ingredient: IngredientAnalysis['ingredients'][number],
): boolean => {
  const haystack = `${ingredient.name} ${ingredient.reason ?? ''}`;
  const tokens = ALLERGY_CONFLICT_TOKENS[allergy] ?? [];

  return matchesAnyToken(haystack, tokens);
};

const parseCustomAllergyEntries = (value: string | null): string[] => {
  if (!value) return [];

  return uniqueValues(
    value
      .split(/[,;/]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );
};

const evaluateAllergens = (
  product: NormalizedProduct,
  facts: ProductFacts,
  onboarding: OnboardingResponse,
  ingredientAnalysis?: IngredientAnalysis,
): InternalScoreReason[] => {
  if (
    onboarding.allergies.length === 0 &&
    !onboarding.otherAllergiesText?.trim()
  ) {
    return [];
  }

  const productValues = uniqueValues([
    ...product.allergens,
    ...product.traces,
    ...product.ingredients,
  ]);
  const matchedNames: string[] = [];
  const detailReasons: string[] = [];

  for (const allergy of onboarding.allergies) {
    if (allergy === 'OTHER') continue;

    matchedNames.push(
      ...collectMatchingProductValues(
        productValues,
        ALLERGY_CONFLICT_TOKENS[allergy] ?? [],
      ),
    );
    matchedNames.push(
      ...collectBadIngredientNames(
        ingredientAnalysis,
        (ingredient) => ingredientMatchesAllergy(allergy, ingredient),
      ),
    );

    const dietKey = ALLERGY_TO_DIET_KEY[allergy];
    if (!dietKey || facts.dietCompatibility[dietKey] !== 'incompatible') {
      continue;
    }

    const aiReason = facts.dietCompatibilityReasons?.[dietKey];
    if (aiReason) {
      detailReasons.push(aiReason);
    }
  }

  const customEntries = parseCustomAllergyEntries(onboarding.otherAllergiesText);
  if (customEntries.length > 0) {
    matchedNames.push(
      ...uniqueValues(
        productValues.filter((value) =>
          customEntries.some((entry) => matchesAnyToken(value, [entry])),
        ),
      ),
    );
    matchedNames.push(
      ...collectBadIngredientNames(ingredientAnalysis, (ingredient) => {
        const haystack = `${ingredient.name} ${ingredient.reason ?? ''}`;
        return customEntries.some((entry) => matchesAnyToken(haystack, [entry]));
      }),
    );
  }

  const conflictNames = uniqueValues(matchedNames);
  if (conflictNames.length === 0 && detailReasons.length === 0) {
    return [];
  }

  const description =
    conflictNames.length > 0
      ? `Contains allergens you should avoid (${formatFactList(conflictNames)})`
      : joinDescriptions(['Contains allergens you should avoid', ...detailReasons]);

  return [
    {
      key: 'allergens',
      label: 'Allergens',
      description,
      value: null,
      unit: null,
      impact: -50,
      kind: 'negative',
      source: 'allergen',
      category: 'allergens',
      displayGroupKey: 'allergens',
    },
  ];
};

const evaluateAdditives = (
  product: NormalizedProduct,
): InternalScoreReason[] => {
  const additiveNames = uniqueValues(product.additives);
  const additiveCount = product.additives_count ?? additiveNames.length;

  if (additiveNames.length === 0 && additiveCount === 0) {
    return [];
  }

  const description =
    additiveNames.length > 0
      ? `Contains additives (${formatFactList(additiveNames)})`
      : `Contains ${additiveCount} additives`;

  return [
    {
      key: 'additives',
      label: 'Additives',
      description,
      value: additiveCount,
      unit: null,
      impact: 0,
      kind: 'negative',
      source: 'ingredient',
      category: 'additives',
      displayGroupKey: 'additives',
    },
  ];
};

// ============================================================
// Goal-based scoring
// ============================================================

const evaluateGoals = (
  facts: ProductFacts,
  onboarding: OnboardingResponse,
): InternalScoreReason[] => {
  const reasons: InternalScoreReason[] = [];
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
      category: 'calories',
      displayGroupKey: 'calories',
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
      category: 'protein',
      displayGroupKey: 'protein',
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
      category: 'protein',
      displayGroupKey: 'protein',
    });
  }

  // Diabetes control: penalize high sugar
  if (goal === 'DIABETES_CONTROL' && s.sugarLevel === 'high') {
    reasons.push({
      key: 'goal-diabetes-sugar',
      label: 'Blood sugar management',
      description:
        'High sugar content conflicts with your diabetes management goal',
      value: n.sugars,
      unit: 'g',
      impact: -15,
      kind: 'negative',
      source: 'goal',
      category: 'sugar',
      displayGroupKey: 'sugar',
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
      category: 'sugar',
      displayGroupKey: 'sugar',
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
        category: 'sugar',
        displayGroupKey: 'sugar',
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
        category: 'sugar',
        displayGroupKey: 'sugar',
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
        category: 'salt',
        displayGroupKey: 'salt',
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
        category: 'salt',
        displayGroupKey: 'salt',
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
        category: 'protein',
        displayGroupKey: 'protein',
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
        category: 'protein',
        displayGroupKey: 'protein',
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
        hidden: true,
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
        hidden: true,
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
        category: 'carbohydrates',
        displayGroupKey: 'carbohydrates',
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
        category: 'carbohydrates',
        displayGroupKey: 'carbohydrates',
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
): InternalScoreReason[] => {
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
  product: NormalizedProduct,
  facts: ProductFacts,
  profile: ScoreProfileInput,
  ingredientAnalysis?: IngredientAnalysis,
): ProfileProductScore => {
  const { onboarding } = profile;

  // Collect all reasons
  const allReasons: InternalScoreReason[] = [
    ...evaluateNutritionFacts(facts),
    ...(evaluateNutriGrade(facts) ? [evaluateNutriGrade(facts)!] : []),
    ...evaluateRestrictions(facts, onboarding, ingredientAnalysis),
    ...evaluateAllergens(product, facts, onboarding, ingredientAnalysis),
    ...evaluateAdditives(product),
    ...evaluateGoals(facts, onboarding),
    ...evaluateProductType(facts, onboarding),
  ];

  // If there are allergen conflicts, a positive "Diet match" is misleading —
  // the product is unsafe for this user regardless of diet label compatibility.
  // Suppress positive diet-matching reasons from both display and score.
  const hasAllergenConflict = allReasons.some(
    (r) => r.source === 'allergen' && r.kind === 'negative',
  );
  if (hasAllergenConflict) {
    for (const reason of allReasons) {
      if (reason.category === 'diet-matching' && reason.kind === 'positive') {
        reason.hidden = true;
        reason.impact = 0;
      }
    }
  }

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
  const positives = buildDisplayReasons(allReasons, ['positive', 'neutral']);
  const negatives = buildDisplayReasons(allReasons, ['negative']);

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
  product: NormalizedProduct,
  facts: ProductFacts,
  profiles: ScoreProfileInput[],
  perProfileIngredients?: Map<string, IngredientAnalysis | null>,
): ProfileProductScore[] => {
  return profiles.map((profile) => {
    const analysis = perProfileIngredients?.get(profile.profileId) ?? undefined;
    return computeProfileScore(product, facts, profile, analysis ?? undefined);
  });
};
