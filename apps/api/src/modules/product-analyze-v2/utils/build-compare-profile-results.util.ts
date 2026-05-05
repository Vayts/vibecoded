/* eslint-disable max-lines */

import type { CompareFact, CompareProductsProfileResult } from '@acme/shared';
import type {
  AnalyzeBarcodeV2ProfileAnalysis,
  AnalyzeBarcodeV2ProfileResult,
  CompareProductV2Result,
} from '../types/analyze-product-v2.types.js';

interface ComparedProduct {
  analysis: AnalyzeBarcodeV2ProfileAnalysis;
  barcode: string;
  product: CompareProductV2Result['product'];
  productId: string;
  profile: AnalyzeBarcodeV2ProfileResult;
  scanId: string;
}

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

const getSafetyRank = (status?: string | null): number => {
  if (status === 'safe') return 3;
  if (status === 'caution') return 2;
  if (status === 'avoid') return 1;
  return 0;
};

const isUnsuitable = (analysis: AnalyzeBarcodeV2ProfileAnalysis): boolean => {
  return analysis.safety?.status === 'avoid' || analysis.overall?.rating === 'avoid';
};

const compareProductsForProfile = (a: ComparedProduct, b: ComparedProduct): number => {
  const aSafety = getSafetyRank(a.analysis.safety?.status);
  const bSafety = getSafetyRank(b.analysis.safety?.status);

  if (aSafety !== bSafety) return aSafety - bSafety;

  const aOverall = a.analysis.overall?.score ?? 0;
  const bOverall = b.analysis.overall?.score ?? 0;
  if (aOverall !== bOverall) return aOverall - bOverall;

  const aGoalFit = a.analysis.goalFit?.score ?? 0;
  const bGoalFit = b.analysis.goalFit?.score ?? 0;
  if (aGoalFit !== bGoalFit) return aGoalFit - bGoalFit;

  const aNutrition = a.analysis.nutrition?.score ?? 0;
  const bNutrition = b.analysis.nutrition?.score ?? 0;
  if (aNutrition !== bNutrition) return aNutrition - bNutrition;

  const aNegatives = a.analysis.negatives?.length ?? 0;
  const bNegatives = b.analysis.negatives?.length ?? 0;

  return bNegatives - aNegatives;
};

const areProductsEquivalent = (a: ComparedProduct, b: ComparedProduct): boolean => {
  const overallDiff = Math.abs((a.analysis.overall?.score ?? 0) - (b.analysis.overall?.score ?? 0));
  const goalFitDiff = Math.abs((a.analysis.goalFit?.score ?? 0) - (b.analysis.goalFit?.score ?? 0));
  const nutritionDiff = Math.abs(
    (a.analysis.nutrition?.score ?? 0) - (b.analysis.nutrition?.score ?? 0),
  );

  return (
    a.analysis.safety?.status === b.analysis.safety?.status &&
    overallDiff <= 2 &&
    goalFitDiff <= 2 &&
    nutritionDiff <= 2
  );
};

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

const buildComparisonFacts = (
  betterProduct: ComparedProduct,
  otherProduct: ComparedProduct,
): CompareFact[] => {
  const facts: CompareFact[] = [];
  const better = betterProduct.analysis;
  const other = otherProduct.analysis;
  const betterNutrition = betterProduct.product.nutrition;
  const otherNutrition = otherProduct.product.nutrition;

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

  if (
    isMeaningfullyHigher(
      betterNutrition?.proteinPer100g,
      otherNutrition?.proteinPer100g,
      MEANINGFUL_DIFF.proteinPer100g,
    )
  ) {
    facts.push({
      key: 'protein',
      label: 'Higher protein',
      value: betterNutrition?.proteinPer100g,
      comparedTo: otherNutrition?.proteinPer100g,
      category: 'nutrition',
    });
  }

  if (
    isMeaningfullyHigher(
      betterNutrition?.fiberPer100g,
      otherNutrition?.fiberPer100g,
      MEANINGFUL_DIFF.fiberPer100g,
    )
  ) {
    facts.push({
      key: 'fiber',
      label: 'More fiber',
      value: betterNutrition?.fiberPer100g,
      comparedTo: otherNutrition?.fiberPer100g,
      category: 'nutrition',
    });
  }

  if (
    isMeaningfullyLower(
      betterNutrition?.sugarPer100g,
      otherNutrition?.sugarPer100g,
      MEANINGFUL_DIFF.sugarPer100g,
    )
  ) {
    facts.push({
      key: 'sugar',
      label: 'Lower sugar',
      value: betterNutrition?.sugarPer100g,
      comparedTo: otherNutrition?.sugarPer100g,
      category: 'nutrition',
    });
  }

  if (
    isMeaningfullyLower(
      betterNutrition?.fatPer100g,
      otherNutrition?.fatPer100g,
      MEANINGFUL_DIFF.fatPer100g,
    )
  ) {
    facts.push({
      key: 'fat',
      label: 'Lower fat',
      value: betterNutrition?.fatPer100g,
      comparedTo: otherNutrition?.fatPer100g,
      category: 'nutrition',
    });
  }

  if (
    isMeaningfullyLower(
      betterNutrition?.saturatedFatPer100g,
      otherNutrition?.saturatedFatPer100g,
      MEANINGFUL_DIFF.saturatedFatPer100g,
    )
  ) {
    facts.push({
      key: 'saturated-fat',
      label: 'Lower saturated fat',
      value: betterNutrition?.saturatedFatPer100g,
      comparedTo: otherNutrition?.saturatedFatPer100g,
      category: 'nutrition',
    });
  }

  if (
    isMeaningfullyLower(
      betterNutrition?.sodiumPer100g,
      otherNutrition?.sodiumPer100g,
      MEANINGFUL_DIFF.sodiumPer100g,
    )
  ) {
    facts.push({
      key: 'sodium',
      label: 'Lower sodium',
      value: betterNutrition?.sodiumPer100g,
      comparedTo: otherNutrition?.sodiumPer100g,
      category: 'nutrition',
    });
  }

  if (
    isMeaningfullyLower(
      betterNutrition?.caloriesPer100g,
      otherNutrition?.caloriesPer100g,
      MEANINGFUL_DIFF.caloriesPer100g,
    )
  ) {
    facts.push({
      key: 'calories',
      label: 'Lower calories',
      value: betterNutrition?.caloriesPer100g,
      comparedTo: otherNutrition?.caloriesPer100g,
      category: 'nutrition',
    });
  }

  const betterAdditives = betterProduct.product.additives?.length ?? 0;
  const otherAdditives = otherProduct.product.additives?.length ?? 0;
  if (isMeaningfullyLower(betterAdditives, otherAdditives, MEANINGFUL_DIFF.additivesCount)) {
    facts.push({
      key: 'additives',
      label: 'Fewer additives',
      value: betterAdditives,
      comparedTo: otherAdditives,
      category: 'ingredients',
    });
  }

  const betterIngredients = betterProduct.product.ingredients?.length ?? 0;
  const otherIngredients = otherProduct.product.ingredients?.length ?? 0;
  if (isMeaningfullyLower(betterIngredients, otherIngredients, MEANINGFUL_DIFF.ingredientsCount)) {
    facts.push({
      key: 'ingredients',
      label: 'Simpler ingredient list',
      value: betterIngredients,
      comparedTo: otherIngredients,
      category: 'ingredients',
    });
  }

  return facts.slice(0, 8);
};

const toComparedProduct = (
  product: CompareProductV2Result,
  profile: AnalyzeBarcodeV2ProfileResult,
): ComparedProduct => ({
  analysis: profile.analysis,
  barcode: product.barcode,
  product: product.product,
  productId: product.productId ?? '',
  profile,
  scanId: product.scanId ?? '',
});

export const buildCompareProfileResults = (
  products: [CompareProductV2Result, CompareProductV2Result],
): CompareProductsProfileResult[] => {
  const profilesById = new Map<string, ComparedProduct[]>();

  products.forEach((product) => {
    (product.profiles ?? []).forEach((profile) => {
      const comparedProducts = profilesById.get(profile.profileId) ?? [];
      comparedProducts.push(toComparedProduct(product, profile));
      profilesById.set(profile.profileId, comparedProducts);
    });
  });

  return Array.from(profilesById.values())
    .filter((profileProducts): profileProducts is [ComparedProduct, ComparedProduct] => {
      return profileProducts.length >= 2;
    })
    .map(([a, b]) => {
      const displayName = a.profile.displayName ?? 'This profile';

      if (isUnsuitable(a.analysis) && isUnsuitable(b.analysis)) {
        return {
          profileId: a.profile.profileId,
          displayName,
          type: a.profile.type,
          status: 'no_suitable_product',
          winnerBarcode: null,
          otherProductBarcode: null,
          winnerBestAt: [],
          anotherProductMayBeBetterAt: [],
        } satisfies CompareProductsProfileResult;
      }

      const comparison = compareProductsForProfile(a, b);
      const winner = comparison >= 0 ? a : b;
      const otherProduct = comparison >= 0 ? b : a;

      return {
        profileId: a.profile.profileId,
        displayName,
        type: a.profile.type,
        status: areProductsEquivalent(a, b) ? 'equivalent' : 'winner_found',
        winnerBarcode: winner.barcode,
        otherProductBarcode: otherProduct.barcode,
        winnerBestAt: buildComparisonFacts(winner, otherProduct),
        anotherProductMayBeBetterAt: buildComparisonFacts(otherProduct, winner),
      } satisfies CompareProductsProfileResult;
    });
};
