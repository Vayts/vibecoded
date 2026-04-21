import { Injectable } from '@nestjs/common';
import {
  DEFAULT_ONBOARDING_RESPONSE,
  type IngredientAnalysis,
  type NormalizedProduct,
  type NutritionFacts,
  type ProductAnalysisResult,
  type ProductFacts,
} from '@acme/shared';
import { getProductFactsService } from './product-facts-ai';
import { searchNutritionData } from './nutrition-websearch';
import { analyzeIngredientsForProfiles } from './ingredient-analysis-ai';
import { generateProfileFitSummaries } from './profile-fit-summary-ai';
import { getProfileInputs } from './profileInputs';
import {
  findProductClassificationCache,
  saveProductClassificationCache,
} from '../repositories/productRepository';
import {
  buildClassificationFromData,
  buildProductFacts,
  buildNutritionFacts,
  hasNutritionData,
} from '../domain/product-facts/build-product-facts';
import {
  computeAllProfileScores,
  type ScoreProfileInput,
} from '../domain/score-engine/compute-score';
import type { AiClassification } from '../domain/product-facts/schema';

@Injectable()
export class AnalysisPipelineService {
  async buildInitialAnalysis(
    product: NormalizedProduct,
    userId?: string,
    productId?: string,
  ): Promise<{
    result: ProductAnalysisResult;
    profiles: ScoreProfileInput[];
    ingredientAnalyses: Map<string, IngredientAnalysis | null>;
  }> {
    const profilesPromise = this.buildProfiles(userId);
    const factsPromise = this.buildProductFacts(product, productId);
    const ingredientAnalysesPromise = profilesPromise.then((profiles) =>
      this.buildProfileIngredientAnalyses(product, profiles),
    );

    const [profiles, facts, ingredientAnalyses] = await Promise.all([
      profilesPromise,
      factsPromise,
      ingredientAnalysesPromise,
    ]);

    const profileScores = computeAllProfileScores(product, facts, profiles, ingredientAnalyses);
    const scoresWithoutIngredientAnalysis = profileScores.map((profileScore) => {
      const score = { ...profileScore };
      delete score.ingredientAnalysis;
      return score;
    });
    const summaries = await generateProfileFitSummaries({
      product,
      profiles: scoresWithoutIngredientAnalysis.map((profileScore, index) => ({
        onboarding: profiles[index].onboarding,
        profileScore,
      })),
    });
    const initialProfileScores = scoresWithoutIngredientAnalysis.map((profileScore) => ({
      ...profileScore,
      summary:
        summaries.get(profileScore.profileId) ??
        'This product is a good fit because its overall nutrition profile lines up well with your preferences.',
    }));

    return {
      result: {
        productFacts: facts,
        profiles: initialProfileScores,
      },
      profiles,
      ingredientAnalyses,
    };
  }

  async buildIngredientEnhancedResult(
    product: NormalizedProduct,
    baseResult: ProductAnalysisResult,
    profiles: ScoreProfileInput[],
    precomputedIngredientAnalyses?: Map<string, IngredientAnalysis | null>,
  ): Promise<{
    result: ProductAnalysisResult;
    hasAnyIngredientAnalysis: boolean;
  }> {
    const perProfileIngredients =
      precomputedIngredientAnalyses ??
      (await this.buildProfileIngredientAnalyses(product, profiles));

    const hasAnyIngredientAnalysis = Array.from(perProfileIngredients.values()).some(
      (ingredientAnalysis) => Boolean(ingredientAnalysis),
    );

    const profileScores = baseResult.profiles.map((profileScore) => {
      const ingredientAnalysis = perProfileIngredients.get(profileScore.profileId) ?? undefined;

      if (!ingredientAnalysis) {
        return profileScore;
      }

      return {
        ...profileScore,
        ingredientAnalysis,
      };
    });

    const selfProfileId =
      profiles.find((profile) => profile.profileType === 'self')?.profileId ?? 'you';
    const selfIngredientAnalysis = perProfileIngredients.get(selfProfileId) ?? undefined;

    return {
      result: {
        productFacts: baseResult.productFacts,
        profiles: profileScores,
        ...(selfIngredientAnalysis ? { ingredientAnalysis: selfIngredientAnalysis } : {}),
      },
      hasAnyIngredientAnalysis,
    };
  }

  private async buildProfileIngredientAnalyses(
    product: NormalizedProduct,
    profiles: ScoreProfileInput[],
  ): Promise<Map<string, IngredientAnalysis | null>> {
    if (product.ingredients.length === 0 && !product.ingredients_text?.trim()) {
      return new Map(profiles.map((profile) => [profile.profileId, null] as const));
    }

    return analyzeIngredientsForProfiles(
      product,
      profiles.map((profile) => ({
        profileId: profile.profileId,
        onboarding: profile.onboarding,
      })),
    );
  }

  private async buildProfiles(userId?: string): Promise<ScoreProfileInput[]> {
    if (!userId) {
      return [
        {
          profileId: 'you',
          profileType: 'self',
          name: 'You',
          onboarding: DEFAULT_ONBOARDING_RESPONSE,
        },
      ];
    }

    const inputs = await getProfileInputs(userId);
    if (inputs.length === 0) {
      return [
        {
          profileId: 'you',
          profileType: 'self',
          name: 'You',
          onboarding: DEFAULT_ONBOARDING_RESPONSE,
        },
      ];
    }

    return inputs.map((input, index) => ({
      profileId: input.profileId,
      profileType: index === 0 ? ('self' as const) : ('family_member' as const),
      name: input.profileName,
      onboarding: input.onboarding,
    }));
  }

  private async resolveClassification(
    product: NormalizedProduct,
    productId?: string,
  ): Promise<AiClassification> {
    const cachedClassification = await findProductClassificationCache({
      productId,
      barcode: product.code,
    });

    if (cachedClassification) {
      console.log(
        `[analysis-pipeline] classification_cache hit barcode=${product.code} productId=${productId ?? 'unknown'}`,
      );
      return cachedClassification;
    }

    console.log(
      `[analysis-pipeline] classification_cache miss barcode=${product.code} productId=${productId ?? 'unknown'}`,
    );

    const result = await getProductFactsService().extractClassificationWithSource(product);

    if (result.source === 'ai') {
      await saveProductClassificationCache({
        productId,
        barcode: product.code,
        classification: result.classification,
      });
      console.log(
        `[analysis-pipeline] classification_cache saved barcode=${product.code} productId=${productId ?? 'unknown'}`,
      );
    } else {
      console.log(
        `[analysis-pipeline] classification_cache not saved (source=${result.source}) barcode=${product.code} productId=${productId ?? 'unknown'}`,
      );
    }

    return result.classification;
  }

  private async buildProductFacts(
    product: NormalizedProduct,
    productId?: string,
  ): Promise<ProductFacts> {
    const productName = product.product_name ?? product.code ?? 'unknown';
    const productHasNutrition = hasNutritionData(product);

    let nutritionFacts: NutritionFacts;
    let classification: ReturnType<typeof buildClassificationFromData>;

    if (productHasNutrition) {
      nutritionFacts = buildNutritionFacts(product);
      classification = await this.resolveClassification(product, productId).catch(() =>
        buildClassificationFromData(product),
      );
    } else {
      const [classificationResult, webNutrition] = await Promise.all([
        this.resolveClassification(product, productId).catch(() =>
          buildClassificationFromData(product),
        ),
        searchNutritionData(productName, product.brands, product.code),
      ]);

      classification = classificationResult;
      nutritionFacts = webNutrition ?? buildNutritionFacts(product);
    }

    return buildProductFacts(classification, nutritionFacts);
  }
}
