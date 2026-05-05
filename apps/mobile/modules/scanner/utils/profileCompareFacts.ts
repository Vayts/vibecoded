import type { CompareFact, ComparedProduct } from './profileCompareTypes';
import { getSafetyRank } from './profileCompareRanking';

const MEANINGFUL_DIFF = {
  proteinPer100g: 1,
  fiberPer100g: 1,
  sugarPer100g: 1,
  fatPer100g: 2,
  saturatedFatPer100g: 1,
  sodiumPer100g: 0.05,
  caloriesPer100g: 20,
  additivesCount: 1,
  ingredientsCount: 3,
};

const HIGHER_BETTER_NUTRITION = [
  {
    key: 'protein',
    field: 'proteinPer100g',
    label: 'Higher protein',
    threshold: MEANINGFUL_DIFF.proteinPer100g,
  },
  {
    key: 'fiber',
    field: 'fiberPer100g',
    label: 'More fiber',
    threshold: MEANINGFUL_DIFF.fiberPer100g,
  },
] as const;

const LOWER_BETTER_NUTRITION = [
  {
    key: 'sugar',
    field: 'sugarPer100g',
    label: 'Lower sugar',
    threshold: MEANINGFUL_DIFF.sugarPer100g,
  },
  { key: 'fat', field: 'fatPer100g', label: 'Lower fat', threshold: MEANINGFUL_DIFF.fatPer100g },
  {
    key: 'saturated-fat',
    field: 'saturatedFatPer100g',
    label: 'Lower saturated fat',
    threshold: MEANINGFUL_DIFF.saturatedFatPer100g,
  },
  {
    key: 'sodium',
    field: 'sodiumPer100g',
    label: 'Lower sodium',
    threshold: MEANINGFUL_DIFF.sodiumPer100g,
  },
  {
    key: 'calories',
    field: 'caloriesPer100g',
    label: 'Lower calories',
    threshold: MEANINGFUL_DIFF.caloriesPer100g,
  },
] as const;

const isMeaningfullyHigher = (
  value?: number | null,
  comparedTo?: number | null,
  threshold = 0,
): boolean => {
  if (value == null || comparedTo == null) return false;
  return value - comparedTo >= threshold;
};

const isMeaningfullyLower = (
  value?: number | null,
  comparedTo?: number | null,
  threshold = 0,
): boolean => {
  if (value == null || comparedTo == null) return false;
  return comparedTo - value >= threshold;
};

const addSafetyFacts = (
  facts: CompareFact[],
  betterProduct: ComparedProduct,
  otherProduct: ComparedProduct,
) => {
  const better = betterProduct.analysis;
  const other = otherProduct.analysis;

  if (getSafetyRank(better.safety?.status) > getSafetyRank(other.safety?.status)) {
    facts.push({ key: 'safety', label: 'Safer for this profile', category: 'safety' });
  }

  const betterAllergens = better.safety?.matchedAllergens?.length ?? 0;
  const otherAllergens = other.safety?.matchedAllergens?.length ?? 0;

  if (betterAllergens === 0 && otherAllergens > 0) {
    facts.push({
      key: 'allergens',
      label: "Doesn't include your allergens",
      category: 'allergens',
    });
  } else if (betterAllergens < otherAllergens) {
    facts.push({
      key: 'allergens',
      label: 'Fewer allergen conflicts',
      value: betterAllergens,
      comparedTo: otherAllergens,
      category: 'allergens',
    });
  }

  const betterRestrictions = better.safety?.violatedRestrictions?.length ?? 0;
  const otherRestrictions = other.safety?.violatedRestrictions?.length ?? 0;

  if (betterRestrictions === 0 && otherRestrictions > 0) {
    facts.push({ key: 'diet-match', label: 'Matches your diet', category: 'restrictions' });
  } else if (betterRestrictions < otherRestrictions) {
    facts.push({
      key: 'restrictions',
      label: 'Fewer diet conflicts',
      value: betterRestrictions,
      comparedTo: otherRestrictions,
      category: 'restrictions',
    });
  }
};

const addNutritionFacts = (
  facts: CompareFact[],
  betterProduct: ComparedProduct,
  otherProduct: ComparedProduct,
) => {
  const betterNutrition = betterProduct.product?.nutrition;
  const otherNutrition = otherProduct.product?.nutrition;

  HIGHER_BETTER_NUTRITION.forEach(({ field, key, label, threshold }) => {
    const value = betterNutrition?.[field];
    const comparedTo = otherNutrition?.[field];
    if (isMeaningfullyHigher(value, comparedTo, threshold)) {
      facts.push({ key, label, value, comparedTo, category: 'nutrition' });
    }
  });

  LOWER_BETTER_NUTRITION.forEach(({ field, key, label, threshold }) => {
    const value = betterNutrition?.[field];
    const comparedTo = otherNutrition?.[field];
    if (isMeaningfullyLower(value, comparedTo, threshold)) {
      facts.push({ key, label, value, comparedTo, category: 'nutrition' });
    }
  });
};

const addIngredientFacts = (
  facts: CompareFact[],
  betterProduct: ComparedProduct,
  otherProduct: ComparedProduct,
) => {
  const betterAdditives = betterProduct.product?.additives?.length ?? 0;
  const otherAdditives = otherProduct.product?.additives?.length ?? 0;

  if (isMeaningfullyLower(betterAdditives, otherAdditives, MEANINGFUL_DIFF.additivesCount)) {
    facts.push({
      key: 'additives',
      label: 'Fewer additives',
      value: betterAdditives,
      comparedTo: otherAdditives,
      category: 'ingredients',
    });
  }

  const betterIngredients = betterProduct.product?.ingredients?.length ?? 0;
  const otherIngredients = otherProduct.product?.ingredients?.length ?? 0;

  if (isMeaningfullyLower(betterIngredients, otherIngredients, MEANINGFUL_DIFF.ingredientsCount)) {
    facts.push({
      key: 'ingredients',
      label: 'Simpler ingredient list',
      value: betterIngredients,
      comparedTo: otherIngredients,
      category: 'ingredients',
    });
  }
};

export const buildComparisonFacts = (
  betterProduct: ComparedProduct,
  otherProduct: ComparedProduct,
): CompareFact[] => {
  const facts: CompareFact[] = [];

  addSafetyFacts(facts, betterProduct, otherProduct);
  addNutritionFacts(facts, betterProduct, otherProduct);
  addIngredientFacts(facts, betterProduct, otherProduct);

  return facts.slice(0, 8);
};
