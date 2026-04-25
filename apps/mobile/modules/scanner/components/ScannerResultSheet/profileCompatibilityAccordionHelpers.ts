import type {
  FamilyMember,
  OnboardingResponse,
  ProductFacts,
  ProfileProductScore,
} from '@acme/shared';

export interface ProfileCompatibilityPreferences {
  restrictions: OnboardingResponse['restrictions'] | FamilyMember['restrictions'];
  allergies: OnboardingResponse['allergies'] | FamilyMember['allergies'];
  otherAllergiesText: string | null;
}

export interface CompatibilityAccordionItem {
  key: string;
  title: string;
  ingredients: string[];
}

const RESTRICTION_LABELS: Record<string, string> = {
  VEGAN: 'vegan',
  VEGETARIAN: 'vegetarian',
  KETO: 'keto',
  PALEO: 'paleo',
  GLUTEN_FREE: 'gluten-free',
  DAIRY_FREE: 'dairy-free',
  HALAL: 'halal',
  KOSHER: 'kosher',
  NUT_FREE: 'nut-free',
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const normalizeText = (value: string): string =>
  value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

const dedupeByName = (names: string[]): string[] => {
  const seen = new Set<string>();
  return names.filter((name) => {
    const key = normalizeText(name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ---------------------------------------------------------------------------
// Legacy fallback helpers
// (used when old backend data is present that lacks reasonType / dietConflicts)
// ---------------------------------------------------------------------------

const RESTRICTION_TO_DIET_KEY = {
  VEGAN: 'vegan',
  VEGETARIAN: 'vegetarian',
  GLUTEN_FREE: 'glutenFree',
  DAIRY_FREE: 'dairyFree',
  HALAL: 'halal',
  KOSHER: 'kosher',
  NUT_FREE: 'nutFree',
} as const;

const ALLERGY_TO_DIET_KEY: Partial<Record<string, keyof ProductFacts['dietCompatibility']>> = {
  PEANUTS: 'nutFree',
  TREE_NUTS: 'nutFree',
  GLUTEN: 'glutenFree',
  DAIRY: 'dairyFree',
};

const NON_INGREDIENT_TOKENS = [
  'allergens you should avoid',
  'you should avoid',
  'allergen',
  'allergens',
  'avoid',
  'contains',
  'conflicts with your',
  'diet',
  'restriction',
  'incompatible',
] as const;

const cleanIngredientToken = (value: string): string =>
  value
    .replace(/[()\[\]{}]/g, ' ')
    .replace(/[^a-zA-Z\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isLikelyIngredientName = (value: string): boolean => {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  if (NON_INGREDIENT_TOKENS.some((token) => normalized.includes(token))) return false;
  const words = normalized.split(' ').filter(Boolean);
  if (words.length === 0 || words.length > 4) return false;
  return /^[a-z\s-]+$/.test(normalized);
};

const reasonToChips = (reason: string): string[] => {
  const fromContains = reason.match(/contains\s+([^.;]+)/i)?.[1] ?? null;
  if (fromContains) {
    return dedupeByName(
      fromContains
        .split(/,|\band\b/i)
        .map((v) => cleanIngredientToken(v))
        .filter((v) => isLikelyIngredientName(v)),
    );
  }

  const fromParentheses = Array.from(reason.matchAll(/\(([^)]+)\)/g)).flatMap((m) =>
    m[1]
      .split(/,|\band\b/i)
      .map((v) => cleanIngredientToken(v))
      .filter((v) => isLikelyIngredientName(v)),
  );

  if (fromParentheses.length > 0) return dedupeByName(fromParentheses);
  return [];
};

/** Build accordion items using legacy string-parsing when new structured fields are absent. */
const buildLegacyAccordionItems = (
  profile: ProfileProductScore,
  productFacts: ProductFacts | null | undefined,
  profilePreferences: ProfileCompatibilityPreferences,
): CompatibilityAccordionItem[] => {
  const badIngredientNames = dedupeByName(
    (profile.ingredientAnalysis?.ingredients ?? [])
      .filter((ing) => ing.status === 'bad')
      .map((ing) => cleanIngredientToken(ing.name))
      .filter((name) => isLikelyIngredientName(name)),
  );

  const dietConflictItems = profilePreferences.restrictions.flatMap<CompatibilityAccordionItem>((restriction) => {
    const dietKey = RESTRICTION_TO_DIET_KEY[restriction as keyof typeof RESTRICTION_TO_DIET_KEY];
    if (!dietKey || productFacts?.dietCompatibility[dietKey] !== 'incompatible') return [];

    const reason = productFacts?.dietCompatibilityReasons?.[dietKey] ?? null;
    const reasonIngredients = reason ? reasonToChips(reason) : [];
    const ingredients = badIngredientNames.length > 0 ? badIngredientNames : reasonIngredients;
    if (ingredients.length === 0) return [];

    const label = RESTRICTION_LABELS[restriction] ?? restriction.toLowerCase();
    return [{ key: `restriction-${restriction}`, title: `Not ${label}`, ingredients }];
  });

  const allergenIngredients = dedupeByName([
    ...badIngredientNames,
    ...profile.negatives
      .filter((n) => n.kind === 'negative' && (n.source === 'allergen' || n.category === 'allergens'))
      .flatMap((n) => reasonToChips(n.description)),
    ...profilePreferences.allergies.flatMap((allergy) => {
      if (allergy === 'OTHER') return [];
      const dietKey = ALLERGY_TO_DIET_KEY[allergy];
      if (!dietKey || productFacts?.dietCompatibility[dietKey] !== 'incompatible') return [];
      return reasonToChips(productFacts?.dietCompatibilityReasons?.[dietKey] ?? '');
    }),
  ]).filter((name) => isLikelyIngredientName(name));

  const concerns: CompatibilityAccordionItem[] = [...dietConflictItems];
  if (allergenIngredients.length > 0) {
    concerns.push({ key: 'allergens-detected', title: 'Allergens detected', ingredients: allergenIngredients });
  }

  return concerns;
};

// ---------------------------------------------------------------------------
// Primary builder — uses structured reasonType / dietConflicts fields
// ---------------------------------------------------------------------------

export const getIngredientCountLabel = (count: number): string =>
  `${count} ingredient${count === 1 ? '' : 's'}`;

export const buildCompatibilityAccordionItems = (
  profile: ProfileProductScore,
  productFacts: ProductFacts | null | undefined,
  profilePreferences: ProfileCompatibilityPreferences | null,
): CompatibilityAccordionItem[] => {
  if (!profilePreferences) return [];

  const ingredients = profile.ingredientAnalysis?.ingredients ?? [];

  // Fall back to legacy parsing when the new structured fields are absent
  // (i.e. all bad ingredients lack reasonType — older cached API responses).
  const badIngredients = ingredients.filter((ing) => ing.status === 'bad');
  const hasStructuredFields = badIngredients.some((ing) => ing.reasonType !== undefined);
  if (!hasStructuredFields) {
    return buildLegacyAccordionItems(profile, productFacts, profilePreferences);
  }

  // --- Diet conflict items: one per user restriction that has conflicting ingredients ---
  const dietConflictItems = profilePreferences.restrictions.flatMap<CompatibilityAccordionItem>((restriction) => {
    const conflictingIngredients = dedupeByName(
      badIngredients
        .filter((ing) => ing.reasonType === 'DIET' && ing.dietConflicts?.includes(restriction))
        .map((ing) => ing.name),
    );

    if (conflictingIngredients.length === 0) return [];

    const label = RESTRICTION_LABELS[restriction] ?? restriction.toLowerCase();
    return [{ key: `restriction-${restriction}`, title: `Not ${label}`, ingredients: conflictingIngredients }];
  });

  // --- Allergens detected item: all bad ingredients flagged as ALLERGY ---
  const allergenIngredients = dedupeByName(
    badIngredients
      .filter((ing) => ing.reasonType === 'ALLERGY')
      .map((ing) => ing.name),
  );

  const concerns: CompatibilityAccordionItem[] = [...dietConflictItems];
  if (allergenIngredients.length > 0) {
    concerns.push({ key: 'allergens-detected', title: 'Allergens detected', ingredients: allergenIngredients });
  }

  return concerns;
};
