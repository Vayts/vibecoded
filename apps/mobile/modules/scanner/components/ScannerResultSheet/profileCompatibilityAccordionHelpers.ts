import type { FamilyMember, IngredientAnalysis, OnboardingResponse } from '@acme/shared';

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

const RESTRICTION_REASON_TOKENS: Record<string, string[]> = {
  VEGAN: ['vegan'],
  VEGETARIAN: ['vegetarian'],
  KETO: ['keto'],
  PALEO: ['paleo'],
  GLUTEN_FREE: ['gluten free', 'gluten-free', 'gluten'],
  DAIRY_FREE: ['dairy free', 'dairy-free', 'dairy'],
  HALAL: ['halal'],
  KOSHER: ['kosher'],
  NUT_FREE: ['nut free', 'nut-free', 'nut'],
};

const RESTRICTION_CONFLICT_TOKENS: Partial<Record<string, string[]>> = {
  VEGAN: ['meat', 'beef', 'chicken', 'pork', 'fish', 'milk', 'whey', 'butter', 'cheese', 'egg', 'honey', 'gelatin', 'lard'],
  VEGETARIAN: ['meat', 'beef', 'chicken', 'pork', 'fish', 'gelatin', 'lard', 'bacon', 'ham'],
  HALAL: ['pork', 'bacon', 'ham', 'lard', 'gelatin', 'wine', 'beer', 'rum', 'alcohol', 'salami'],
  KOSHER: ['pork', 'bacon', 'ham', 'shellfish', 'shrimp', 'crab', 'lobster', 'lard'],
  GLUTEN_FREE: ['wheat', 'barley', 'rye', 'spelt', 'semolina', 'bulgur', 'malt', 'seitan', 'farro', 'durum', 'gluten'],
  DAIRY_FREE: ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'whey', 'casein', 'lactose', 'dairy'],
  NUT_FREE: ['peanut', 'almond', 'walnut', 'cashew', 'hazelnut', 'pistachio', 'macadamia', 'pecan', 'tree nut', 'nut'],
};

const ALLERGY_LABELS: Record<string, string> = {
  PEANUTS: 'peanuts',
  TREE_NUTS: 'tree nuts',
  GLUTEN: 'gluten',
  DAIRY: 'dairy',
  SOY: 'soy',
  EGGS: 'eggs',
  SHELLFISH: 'shellfish',
  SESAME: 'sesame',
};

const ALLERGY_TOKENS: Record<string, string[]> = {
  PEANUTS: ['peanut'],
  TREE_NUTS: ['almond', 'walnut', 'cashew', 'hazelnut', 'pistachio', 'macadamia', 'pecan', 'tree nut', 'nut'],
  GLUTEN: ['wheat', 'barley', 'rye', 'spelt', 'semolina', 'bulgur', 'malt', 'seitan', 'farro', 'durum', 'gluten'],
  DAIRY: ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'whey', 'casein', 'lactose', 'dairy'],
  SOY: ['soy'],
  EGGS: ['egg'],
  SHELLFISH: ['shellfish', 'shrimp', 'crab', 'lobster'],
  SESAME: ['sesame'],
};

const normalizeText = (value: string): string =>
  value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

const matchesAnyToken = (value: string, tokens: string[]): boolean => {
  const normalizedValue = normalizeText(value);
  return tokens.some((token) => normalizedValue.includes(normalizeText(token)));
};

const dedupeIngredients = (values: string[]): string[] => {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalizedValue = normalizeText(value);
    if (!normalizedValue || seen.has(normalizedValue)) {
      return false;
    }

    seen.add(normalizedValue);
    return true;
  });
};

const parseOtherAllergyEntries = (value: string | null): string[] => {
  if (!value) {
    return [];
  }

  return dedupeIngredients(value.split(/[,;/]/).map((entry) => entry.trim()).filter(Boolean));
};

const collectBadIngredients = (
  ingredientAnalysis: IngredientAnalysis | null | undefined,
  matcher: (haystack: string, name: string) => boolean,
): string[] => {
  if (!ingredientAnalysis) {
    return [];
  }

  return dedupeIngredients(
    ingredientAnalysis.ingredients
      .filter((ingredient) => {
        if (ingredient.status !== 'bad') {
          return false;
        }

        const haystack = `${ingredient.name} ${ingredient.reason ?? ''}`;
        return matcher(haystack, ingredient.name);
      })
      .map((ingredient) => ingredient.name),
  );
};

const getRestrictionIngredients = (
  restriction: string,
  ingredientAnalysis?: IngredientAnalysis | null,
): string[] => {
  const reasonTokens = RESTRICTION_REASON_TOKENS[restriction] ?? [];
  const conflictTokens = RESTRICTION_CONFLICT_TOKENS[restriction] ?? [];

  return collectBadIngredients(
    ingredientAnalysis,
    (haystack, ingredientName) =>
      matchesAnyToken(haystack, reasonTokens) || matchesAnyToken(ingredientName, conflictTokens),
  );
};

const getAllergyIngredients = (
  allergy: string,
  ingredientAnalysis?: IngredientAnalysis | null,
): string[] => {
  const tokens = ALLERGY_TOKENS[allergy] ?? [];
  return collectBadIngredients(ingredientAnalysis, (haystack) => matchesAnyToken(haystack, tokens));
};

const getCustomAllergyIngredients = (
  entries: string[],
  ingredientAnalysis?: IngredientAnalysis | null,
): string[] => {
  return collectBadIngredients(ingredientAnalysis, (haystack) => {
    return entries.some((entry) => matchesAnyToken(haystack, [entry]));
  });
};

export const getIngredientCountLabel = (count: number): string => {
  return `${count} ingredient${count === 1 ? '' : 's'}`;
};

export const buildCompatibilityAccordionItems = (
  ingredientAnalysis: IngredientAnalysis | null | undefined,
  profilePreferences: ProfileCompatibilityPreferences | null,
): CompatibilityAccordionItem[] => {
  if (!ingredientAnalysis || !profilePreferences) {
    return [];
  }

  const restrictionItems = profilePreferences.restrictions.flatMap<CompatibilityAccordionItem>((restriction) => {
    const ingredients = getRestrictionIngredients(restriction, ingredientAnalysis);
    if (ingredients.length === 0) {
      return [];
    }

    const label = RESTRICTION_LABELS[restriction] ?? restriction.toLowerCase();
    return [{ key: `restriction-${restriction}`, title: `Not-${label}`, ingredients }];
  });

  const allergyItems = profilePreferences.allergies.flatMap<CompatibilityAccordionItem>((allergy) => {
    if (allergy === 'OTHER') {
      return [];
    }

    const ingredients = getAllergyIngredients(allergy, ingredientAnalysis);
    if (ingredients.length === 0) {
      return [];
    }

    return [{
      key: `allergy-${allergy}`,
      title: `Contains ${ALLERGY_LABELS[allergy] ?? allergy.toLowerCase()}`,
      ingredients,
    }];
  });

  const customAllergyEntries = parseOtherAllergyEntries(profilePreferences.otherAllergiesText);
  const customAllergyIngredients = getCustomAllergyIngredients(customAllergyEntries, ingredientAnalysis);
  const customItems = customAllergyIngredients.length > 0
    ? [{ key: 'allergy-other', title: 'Contains allergens', ingredients: customAllergyIngredients }]
    : [];

  return [...restrictionItems, ...allergyItems, ...customItems];
};

