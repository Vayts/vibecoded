import type { MainGoal } from '../../types/scoring.types.js';
import { prisma } from '../../../../shared/lib/prisma.js';
import { normalizeOpenFoodFactsProduct } from '../../utils/normalize-open-food-facts-product.util.js';
import { calculateNutritionScore } from '../../utils/calculate-nutrition-score.util.js';
import type { ProfileInputForScoring } from '../../types/scoring.types.js';
import type {
  AnalyzeBarcodeV2Response,
  AnalyzeBarcodeV2ProfileResult,
} from '../../types/analyze-product-v2.types.js';
import { ApiError } from '../../../../shared/errors/api-error.js';
import { validateAndNormalizeAiResult } from './analyze-barcode/ai-normalization.js';
import {
  analyzeAdviceWithAI,
  analyzeCoreWithAI,
  analyzeTracesWithAI,
  mergeAdviceIntoValidatedAiResult,
  mergeCoreAndTraceOutputs,
} from './analyze-barcode/ai-passes.js';
import {
  buildProfileAnalysis,
  buildProfileResult,
  resolveProductRole,
} from './analyze-barcode/profile-results.js';
import { findReusableAnalyzedProductByBarcode as findReusableAnalyzedProductByBarcodeFromCache } from './analyze-barcode/cache-reuse.js';
import { normalizeProfileInput } from '../../utils/normalize-profile-input.util.js';
import { resolveBarcodeProductContext } from '../../utils/resolve-barcode-product.util.js';

export interface AnalyzedProductByBarcodeResult {
  barcode: string;
  result: AnalyzeBarcodeV2Response;
  reusedExistingAnalysis: boolean;
  productId?: string;
  scanId?: string;
}

interface AnalyzeBarcodeNodeState {
  barcode: string;
  userId: string;
}

function isFamilyAnalysisEnabled(
  subscriptionStatus: string | null | undefined,
  subscriptionExpiry: Date | null | undefined,
): boolean {
  return (
    subscriptionStatus === 'active' && (!subscriptionExpiry || subscriptionExpiry > new Date())
  );
}

export async function analyzeNormalizedProductForUser(input: {
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>;
  userId: string;
  logContext?: string;
}): Promise<AnalyzeBarcodeV2Response> {
  const { product, userId } = input;
  const logContext = input.logContext ?? `barcode=${product.barcode}`;

  // 3. Load user with subscription and profile
  console.log(`[ProductAnalyzeV2] Loading user — userId=${userId} ${logContext}`);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      subscriptionStatus: true,
      subscriptionExpiry: true,
      profile: {
        select: {
          id: true,
          mainGoal: true,
          restrictions: true,
          allergies: true,
          otherAllergiesText: true,
        },
      },
      familyMembers: {
        select: {
          id: true,
          name: true,
          mainGoal: true,
          restrictions: true,
          allergies: true,
          otherAllergiesText: true,
        },
      },
    },
  });

  if (!user) {
    throw ApiError.unauthorized();
  }

  const familyEnabled = isFamilyAnalysisEnabled(user.subscriptionStatus, user.subscriptionExpiry);

  console.log(
    `[ProductAnalyzeV2] Subscription — status=${user.subscriptionStatus} familyEnabled=${familyEnabled}`,
  );

  // 4. Build profile inputs
  const mainProfile = normalizeProfileInput({
    profileId: user.profile?.id ?? userId,
    profileType: 'user',
    displayName: user.name ?? null,
    mainGoal: (user.profile?.mainGoal as MainGoal | null) ?? null,
    restrictions: user.profile?.restrictions ?? [],
    allergies: user.profile?.allergies ?? [],
    otherAllergiesText: user.profile?.otherAllergiesText ?? null,
  });

  const familyProfiles: ProfileInputForScoring[] = familyEnabled
    ? user.familyMembers.map((member) =>
        normalizeProfileInput({
          profileId: member.id,
          profileType: 'family_member' as const,
          displayName: member.name,
          mainGoal: (member.mainGoal as MainGoal | null) ?? null,
          restrictions: member.restrictions ?? [],
          allergies: member.allergies ?? [],
          otherAllergiesText: member.otherAllergiesText ?? null,
        }),
      )
    : [];

  const allProfiles: ProfileInputForScoring[] = [mainProfile, ...familyProfiles];

  console.log(
    `[ProductAnalyzeV2] Main profile — goal=${mainProfile.mainGoal} restrictions=${mainProfile.restrictions.length} allergies=${mainProfile.allergies.length}`,
  );

  // 5. Classify product role and detect profile allergens/restrictions via AI (once per product+profiles)
  console.log(
    `[ProductAnalyzeV2] Running AI analysis — ${logContext} profiles=${allProfiles.length}`,
  );
  const [rawCoreAiOutput, rawTraceAuditOutput] = await Promise.all([
    analyzeCoreWithAI(product, allProfiles),
    analyzeTracesWithAI(product, allProfiles),
  ]);
  const provisionalAiResult = validateAndNormalizeAiResult(
    mergeCoreAndTraceOutputs(rawCoreAiOutput, rawTraceAuditOutput),
    allProfiles,
    product,
  );

  if (!provisionalAiResult.product.isFoodProduct) {
    console.warn(
      `[ProductAnalyzeV2] Product rejected by AI food detection — ${logContext} evidence=${provisionalAiResult.product.evidence.join(' | ')}`,
    );
    throw ApiError.unprocessable('This product does not appear to be a food item', 'NOT_FOOD');
  }

  const rawAdviceOutput = await analyzeAdviceWithAI(product, allProfiles, provisionalAiResult);
  const aiResult = mergeAdviceIntoValidatedAiResult(provisionalAiResult, rawAdviceOutput);

  console.log(`[ProductAnalyzeV2] Ai result], ${JSON.stringify(aiResult, null, 2)}`);

  // 6. Resolve product role from AI result
  const roleResult = resolveProductRole(aiResult.product);

  console.log(
    `[ProductAnalyzeV2] Final role — role=${roleResult.value} source=${roleResult.source} confidence=${roleResult.confidence} validated=${roleResult.validated}`,
  );

  // 7. Calculate nutrition score once (product-level)
  const nutritionResult = calculateNutritionScore(product, roleResult.value);
  console.log(`[ProductAnalyzeV2] Nutrition score — score=${nutritionResult.score}`);

  // 8. Calculate scores for main profile using AI profile info
  const mainAiProfileInfo =
    aiResult.profileInfo.find(
      (p) => p.profileId === mainProfile.profileId && p.profileType === 'user',
    ) ?? null;

  const mainProfileAnalysis = buildProfileAnalysis(
    mainProfile,
    roleResult,
    product,
    nutritionResult,
    mainAiProfileInfo,
  );
  console.log(
    `[ProductAnalyzeV2] Main profile scores — safety=${mainProfileAnalysis.safety.score} goalFit=${mainProfileAnalysis.goalFit.score} overall=${mainProfileAnalysis.overall.score}`,
  );

  // 9. Calculate scores for family members if subscription is active
  const profileResults: AnalyzeBarcodeV2ProfileResult[] = [
    buildProfileResult(mainProfile, mainProfileAnalysis, mainAiProfileInfo),
  ];

  for (const memberProfile of familyProfiles) {
    const memberAiProfileInfo =
      aiResult.profileInfo.find(
        (p) => p.profileId === memberProfile.profileId && p.profileType === 'family_member',
      ) ?? null;

    const memberAnalysis = buildProfileAnalysis(
      memberProfile,
      roleResult,
      product,
      nutritionResult,
      memberAiProfileInfo,
    );
    console.log(
      `[ProductAnalyzeV2] Family member "${memberProfile.displayName}" — overall=${memberAnalysis.overall.score}`,
    );

    profileResults.push(buildProfileResult(memberProfile, memberAnalysis, memberAiProfileInfo));
  }

  // 10. Build response
  const response: AnalyzeBarcodeV2Response = {
    product: {
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
    },
    profiles: profileResults,
  };

  return response;
}

export async function findReusableAnalyzedProductByBarcode(input: {
  barcode: string;
  userId: string;
}): Promise<AnalyzedProductByBarcodeResult | null> {
  return findReusableAnalyzedProductByBarcodeFromCache(input);
}

async function analyzeFreshProductByBarcode(input: {
  barcode: string;
  userId: string;
}): Promise<AnalyzedProductByBarcodeResult> {
  const { barcode, userId } = input;

  console.log(`[ProductAnalyzeV2] Starting barcode analysis — barcode=${barcode} userId=${userId}`);

  const resolvedProduct = await resolveBarcodeProductContext({ barcode });
  const product = resolvedProduct.product;
  console.log(
    `[ProductAnalyzeV2] Product resolved — source=${resolvedProduct.source} name="${product.name ?? 'unknown'}"`,
  );
  const result = await analyzeNormalizedProductForUser({
    product,
    userId,
    logContext: `barcode=${barcode}`,
  });

  return {
    barcode,
    result,
    reusedExistingAnalysis: false,
    ...(resolvedProduct.productId ? { productId: resolvedProduct.productId } : {}),
  };
}

export async function getOrAnalyzeProductByBarcode(input: {
  barcode: string;
  userId: string;
}): Promise<AnalyzedProductByBarcodeResult> {
  const reusableProduct = await findReusableAnalyzedProductByBarcode(input);

  if (reusableProduct) {
    return reusableProduct;
  }

  return analyzeFreshProductByBarcode(input);
}

export async function analyzeBarcodeNode(state: AnalyzeBarcodeNodeState): Promise<{
  result: AnalyzeBarcodeV2Response;
  analyzedProduct: AnalyzedProductByBarcodeResult;
}> {
  const analyzedProduct = await getOrAnalyzeProductByBarcode({
    barcode: state.barcode,
    userId: state.userId,
  });

  return { result: analyzedProduct.result, analyzedProduct };
}
