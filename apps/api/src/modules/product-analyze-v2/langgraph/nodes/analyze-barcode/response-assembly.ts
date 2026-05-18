import type {
  AnalyzeBarcodeV2ProfileResult,
  AnalyzeBarcodeV2Response,
} from '../../../types/analyze-product-v2.types.js';
import type { ProfileInputForScoring, RoleResult } from '../../../types/scoring.types.js';
import type { ValidatedAiAnalyzeV2Result } from './ai-contracts.js';
import type { AiProfileInfoWithIngredients } from './ai-contracts.js';
import { buildProfileAnalysis, buildProfileResult, resolveProductRole } from './profile-results.js';
import { calculateNutritionScore } from '../../../utils/calculate-nutrition-score.util.js';
import { normalizeOpenFoodFactsProduct } from '../../../utils/normalize-open-food-facts-product.util.js';

interface BuildAnalyzeBarcodeResponseInput {
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>;
  profiles: ProfileInputForScoring[];
  aiResult: ValidatedAiAnalyzeV2Result;
}

export interface AnalyzeBarcodeResponseAssembly {
  response: AnalyzeBarcodeV2Response;
  roleResult: RoleResult;
  nutritionScore: number;
}

const findAiProfileInfo = (
  aiResult: ValidatedAiAnalyzeV2Result,
  profile: ProfileInputForScoring,
): AiProfileInfoWithIngredients | null => {
  return (
    aiResult.profileInfo.find(
      (candidate) =>
        candidate.profileId === profile.profileId && candidate.profileType === profile.profileType,
    ) ?? null
  );
};

const buildProfileResults = (input: {
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>;
  profiles: ProfileInputForScoring[];
  aiResult: ValidatedAiAnalyzeV2Result;
  roleResult: RoleResult;
  nutritionResult: ReturnType<typeof calculateNutritionScore>;
}): AnalyzeBarcodeV2ProfileResult[] => {
  return input.profiles.map((profile) => {
    const aiProfileInfo = findAiProfileInfo(input.aiResult, profile);
    const analysis = buildProfileAnalysis(
      profile,
      input.roleResult,
      input.product,
      input.nutritionResult,
      aiProfileInfo,
    );

    return buildProfileResult(profile, analysis, aiProfileInfo);
  });
};

const buildProductResponse = (
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
  aiResult: ValidatedAiAnalyzeV2Result,
): AnalyzeBarcodeV2Response['product'] => {
  return {
    isFoodProduct: aiResult.product.isFoodProduct,
    name: product.name,
    englishName: aiResult.product.englishName,
    brand: product.brand,
    imageUrl: product.imageUrl,
    ingredients: product.ingredients,
    allergens: product.allergens,
    traces: product.traces,
    additives: product.additives,
    nutrition: {
      caloriesPer100g: product.nutrition.caloriesPer100g,
      caloriesPerServing: product.nutrition.caloriesPerServing,
      proteinPer100g: product.nutrition.proteinPer100g,
      carbsPer100g: product.nutrition.carbsPer100g,
      sugarPer100g: product.nutrition.sugarPer100g,
      fatPer100g: product.nutrition.fatPer100g,
      saturatedFatPer100g: product.nutrition.saturatedFatPer100g,
      fiberPer100g: product.nutrition.fiberPer100g,
      sodiumPer100g: product.nutrition.sodiumPer100g,
    },
  };
};

export function buildAnalyzeBarcodeResponse(
  input: BuildAnalyzeBarcodeResponseInput,
): AnalyzeBarcodeResponseAssembly {
  const roleResult = resolveProductRole(input.aiResult.product);
  const nutritionResult = calculateNutritionScore(input.product, roleResult.value);

  return {
    roleResult,
    nutritionScore: nutritionResult.score,
    response: {
      product: buildProductResponse(input.product, input.aiResult),
      profiles: buildProfileResults({
        product: input.product,
        profiles: input.profiles,
        aiResult: input.aiResult,
        roleResult,
        nutritionResult,
      }),
    },
  };
}
