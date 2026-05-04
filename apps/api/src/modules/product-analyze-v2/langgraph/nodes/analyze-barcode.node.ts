import type { NormalizedProduct } from '@acme/shared';
import type { MainGoal, SafetyResult } from '../../types/scoring.types.js';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { prisma } from '../../../product-analyze/lib/prisma.js';
import {
  lookupBarcode,
  OpenFoodFactsLookupError,
} from '../../../product-analyze/services/openfoodfacts-client.js';
import { normalizeOpenFoodFactsProduct } from '../../utils/normalize-open-food-facts-product.util.js';
import { validateProductRole } from '../../utils/validate-product-role.util.js';
import { calculateSafetyScore } from '../../utils/calculate-safety-score.util.js';
import { calculateGoalFitScore } from '../../utils/calculate-goal-fit-score.util.js';
import { calculateNutritionScore } from '../../utils/calculate-nutrition-score.util.js';
import { calculateOverallScore } from '../../utils/calculate-overall-score.util.js';
import { buildProfileScoreReasons } from '../../utils/build-profile-score-reasons.util.js';
import {
  VALID_PRODUCT_ROLES,
  PRODUCT_ROLE_SET,
  FALLBACK_ROLE,
  MIN_AI_CONFIDENCE,
} from '../../constants/product-roles.constants.js';
import type { ProductRole } from '../../types/product-role.types.js';
import type {
  ProfileInputForScoring,
  ProfileAnalysisResult,
  RoleResult,
} from '../../types/scoring.types.js';
import type {
  AnalyzeBarcodeV2Response,
  AnalyzeBarcodeV2ProfileResult,
} from '../../types/analyze-product-v2.types.js';
import type { AiProfileInfo, AiProductAnalyzeV2Result } from '../../types/ai-analyze.types.js';
import type { GraphStateType } from '../product-analyze-v2.graph.js';
import { ApiError } from '../../../../shared/errors/api-error.js';
import {
  translateIngredientsToEnglish,
  type TranslatedIngredients,
} from '../../utils/translate-ingredients.util.js';

const AI_MODEL = 'gpt-5.4-mini';

const VALID_ALLERGIES_LIST = [
  'PEANUTS',
  'TREE_NUTS',
  'GLUTEN',
  'DAIRY',
  'SOY',
  'EGGS',
  'SHELLFISH',
  'SESAME',
  'OTHER',
] as const;

const VALID_RESTRICTIONS_LIST = [
  'VEGAN',
  'VEGETARIAN',
  'KETO',
  'PALEO',
  'GLUTEN_FREE',
  'DAIRY_FREE',
  'PORK_FREE',
  'NUT_FREE',
] as const;

const VALID_ALLERGY_SET = new Set(VALID_ALLERGIES_LIST as readonly string[]);
const VALID_RESTRICTION_SET = new Set(VALID_RESTRICTIONS_LIST as readonly string[]);
const VALID_RESTRICTION_STATUS_SET = new Set([
  'compatible',
  'not_compatible',
  'unclear',
  'requires_certification',
]);

const allergenDetectionSchema = z.object({
  allergy: z.string(),
  detected: z.boolean(),
  source: z.enum(['off_allergen_tag', 'off_trace_tag', 'ingredient_text', 'ai_inference']),
  confidence: z.number().min(0).max(1),
  ingredients: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
});

const restrictionDetectionSchema = z.object({
  restriction: z.string(),
  status: z.enum(['compatible', 'not_compatible', 'unclear', 'requires_certification']),
  compatible: z.boolean().nullable().optional(),
  source: z.enum(['off_tag', 'ingredient_text', 'certification_tag', 'ai_inference']),
  confidence: z.number().min(0).max(1),
  ingredients: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
});

const profileInfoSchema = z.object({
  profileType: z.enum(['user', 'family_member']),
  profileId: z.string(),
  displayName: z.string().nullable().optional(),
  allergenDetections: z.array(allergenDetectionSchema).default([]),
  restrictionDetections: z.array(restrictionDetectionSchema).default([]),
  canIHaveThis: z.object({
    can: z.boolean(),
    reason: z.string().min(1),
  }),
  uncertaintyFlags: z
    .array(
      z.object({
        type: z.enum([
          'ambiguous_ingredient',
          'missing_ingredients',
          'missing_allergen_data',
          'low_confidence',
          'unknown_restriction_compatibility',
        ]),
        message: z.string(),
      }),
    )
    .default([]),
});

const aiAnalyzeV2OutputSchema = z.object({
  product: z.object({
    role: z.string().describe('One of the ProductRole values'),
    confidence: z.number().min(0).max(1).describe('Confidence from 0 to 1'),
    evidence: z.array(z.string()).describe('Short evidence strings supporting the role'),
  }),
  profileInfo: z.array(profileInfoSchema).describe('Per-profile analysis results'),
});

type AiAnalyzeV2Output = z.infer<typeof aiAnalyzeV2OutputSchema>;

function buildAiAnalysisPrompt(
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
  profiles: ProfileInputForScoring[],
  translatedIngredients: TranslatedIngredients,
): string {
  const hasTranslation =
    translatedIngredients.ingredientsEnglish.length > 0 &&
    translatedIngredients.ingredientsOriginal.join(', ') !==
      translatedIngredients.ingredientsEnglish.join(', ');

  const ingredientsDisplay = translatedIngredients.ingredientsEnglish.length
    ? translatedIngredients.ingredientsEnglish.join(', ')
    : translatedIngredients.ingredientsOriginal.join(', ') || 'Not listed';

  const ingredientsLine = hasTranslation
    ? `Ingredients (English — use these exact English names in allergenDetections.ingredients and restrictionDetections.ingredients): ${ingredientsDisplay}\nIngredients (original — reference only, do not copy these strings into output): ${translatedIngredients.ingredientsOriginal.join(', ')}`
    : `Ingredients: ${ingredientsDisplay}`;

  const productLines: string[] = [
    `Product name: ${product.name ?? 'Unknown'}`,
    `Brand: ${product.brand ?? 'Unknown'}`,
    `Categories: ${product.categories.join(', ') || 'None'}`,
    ingredientsLine,
    `Allergens (from product data): ${product.allergens.join(', ') || 'None'}`,
    `Traces (from product data): ${product.traces.join(', ') || 'None'}`,
    `Additives: ${product.additives.join(', ') || 'None'}`,
  ];

  const n = product.nutrition;
  if (n.caloriesPer100g !== null) productLines.push(`Calories per 100g: ${n.caloriesPer100g} kcal`);
  if (n.proteinPer100g !== null) productLines.push(`Protein per 100g: ${n.proteinPer100g}g`);
  if (n.fatPer100g !== null) productLines.push(`Fat per 100g: ${n.fatPer100g}g`);
  if (n.carbsPer100g !== null) productLines.push(`Carbohydrates per 100g: ${n.carbsPer100g}g`);

  const profileLines: string[] = profiles.map((p, i) => {
    const lines = [
      `Profile ${i + 1}:`,
      `  profileType: ${p.profileType}`,
      `  profileId: ${p.profileId}`,
      `  displayName: ${p.displayName ?? 'null'}`,
      `  allergies: ${p.allergies.join(', ') || 'none'}`,
    ];
    if (p.otherAllergiesText) {
      lines.push(`  otherAllergiesText: ${p.otherAllergiesText}`);
    }
    lines.push(`  restrictions: ${p.restrictions.join(', ') || 'none'}`);
    return lines.join('\n');
  });

  return `PRODUCT DATA:\n${productLines.join('\n')}\n\nPROFILES:\n${profileLines.join('\n\n')}`;
}

function buildSystemPrompt(): string {
  const rolesStr = VALID_PRODUCT_ROLES.join(', ');
  const allergiesStr = VALID_ALLERGIES_LIST.join(', ');
  const restrictionsStr = VALID_RESTRICTIONS_LIST.join(', ');

  return `You are a food product analyzer. Return strictly valid JSON only.

Do not return markdown.
Do not return explanations outside JSON.
Do not calculate scores.
Do not calculate weights.
Do not decide final safety status.
Only classify product role, detect profile-specific allergen/restriction compatibility issues, and provide a short profile-level canIHaveThis answer.

Top-level JSON shape:
{
  "product": {
    "role": ProductRole,
    "confidence": number,
    "evidence": string[]
  },
  "profileInfo": ProfileInfo[]
}

Each ProfileInfo item must include:
{
  "profileType": "user" | "family_member",
  "profileId": string,
  "displayName": string | null,
  "allergenDetections": AllergenDetection[],
  "restrictionDetections": RestrictionDetection[],
  "canIHaveThis": {
    "can": boolean,
    "reason": string
  },
  "uncertaintyFlags": UncertaintyFlag[]
}

The canIHaveThis.reason must be in English and must be 1-2 short sentences. User-facing and practical. Do not mention AI, scores, confidence values, or enum names.

Allowed product.role values: ${rolesStr}

Allowed allergy values: ${allergiesStr}
Allowed restriction values: ${restrictionsStr}

Allergen detection sources: off_allergen_tag, off_trace_tag, ingredient_text, ai_inference
Restriction detection sources: off_tag, ingredient_text, certification_tag, ai_inference
Restriction statuses: compatible, not_compatible, unclear, requires_certification

SCOPE RULE — VERY IMPORTANT:
For each profile, analyze ONLY the allergies listed in that profile's allergies array and ONLY the restrictions listed in that profile's restrictions array.

Do not analyze allergies that are not present in the profile.
Do not analyze restrictions that are not present in the profile.

The enum lists above are allowed output values only. They are NOT a checklist to analyze every item.

If profile.allergies is empty, return: "allergenDetections": []
If profile.restrictions is empty, return: "restrictionDetections": []

Do not return detected:false entries for allergies the user does not have.
Do not return compatible:true entries for restrictions the user did not select.

canIHaveThis.reason must only reference:
- selected allergies of this profile,
- selected restrictions of this profile,
- product-level nutrition or portion guidance,
- product role.
It must NOT mention allergies or restrictions that are not selected by this profile.

When returning allergenDetections[].ingredients or restrictionDetections[].ingredients, ALWAYS use English-only ingredient names.
Never return original-language ingredient strings in these arrays.
Prefer exact phrases from the provided "Ingredients (English ...)" line.
If you cannot ground a detection to a specific English ingredient phrase, return an empty ingredients array instead of using the original-language text.
Evidence may mention both the original and English ingredient, for example: "Original ingredient 'Jambon frais de porc' translates to 'fresh pork ham', which contains pork."

IMPORTANT restriction rules:

Be practical and avoid over-warning.

Default policy:
- Do not return unclear or requires_certification just because certification could theoretically be required.
- Only return unclear or requires_certification when product data contains a concrete trigger.
- Absence of certification alone is NOT a trigger for simple plant products or simple fish products.
- If a product is simple and its listed ingredients are clearly compatible with the selected restriction, return compatible.
- Do not create caution from theoretical processing or handling concerns unless the product data mentions a relevant processing aid, flavoring, additive, cross-contamination warning, alcohol, animal-derived ingredient, or certification-related claim.

Simple compatible products:
- Plain olive oil, plain plant oils, fruits, vegetables, grains, legumes, nuts, and seeds are usually compatible with PORK_FREE unless suspicious ingredients are present.
- Fish with fins and scales such as sardines, tuna, salmon, mackerel, and anchovies are usually compatible with PORK_FREE when ingredients are simple.
- Sardines in olive oil, sunflower oil, tomato sauce, brine, water, or simple plant oil should usually be compatible unless there is pork, lard, pork-derived gelatin, pork fat, pork broth, or another concrete pork-source trigger.
- Do not create caution for plain sardines, sardines in oil, plain olive oil, fruits, vegetables, grains, legumes, nuts, or seeds unless there is a concrete conflicting ingredient or suspicious pork-source signal.

PORK_FREE rules:
- not_compatible: pork, bacon, ham, lard, prosciutto, pancetta, pork-derived gelatin, pork fat, pork broth, or another clearly pork-based ingredient is present.
- unclear: gelatin with unspecified source; animal fat or shortening with unspecified source; meat stock or broth with unspecified source; sausage, salami, or pepperoni with unclear meat source; animal-derived enzymes/flavorings with unclear source.
- compatible: simple plant product, plain oil, plain fruit/vegetable/grain/legume/nut/seed with no suspicious additives; plain fish or fish in simple oil/brine/tomato/water.
- Do not require certification for PORK_FREE.

VEGAN/VEGETARIAN rules:
- not_compatible: meat, fish/seafood, dairy for vegan, eggs for vegan, animal-derived gelatin, or clearly animal-derived enzymes.
- unclear: natural flavors could be animal-derived only when the product context makes that plausible; rennet/enzymes with unspecified source; ambiguous additives like mono/diglycerides when relevant.
- Do not over-warn on simple plant products.
- Do not mark simple plant oils, fruits, vegetables, grains, legumes, nuts, or seeds as unclear for vegan/vegetarian without a concrete suspicious ingredient.

GLUTEN_FREE/DAIRY_FREE/NUT_FREE rules:
- not_compatible: relevant ingredient is clearly present.
- unclear/caution: traces or cross-contamination explicitly mention the relevant allergen; ingredient is ambiguous and commonly contains the restricted item.
- Do not warn if restriction is not selected by the profile.
- Do not infer cross-contamination if product data does not mention it.

PALEO rules:
- not_compatible: clearly non-paleo ingredients such as grains, legumes, dairy, refined sugar-heavy products, or highly processed additives when relevant.
- unclear: processed additives may make compatibility unclear only when they are actually present and relevant.
- Do not mark simple whole foods as unclear without a concrete reason.

Certification policy:
- Use requires_certification only when the product data explicitly presents a real certification-dependent trigger.
- Do not use requires_certification for PORK_FREE.
- Do not use generic statements like "certification may be required" unless the product data contains a realistic trigger.
- If the only concern is theoretical certification, do not create an unclear/requires_certification detection.

Existing hard rules:
- If product contains pork and restriction is PORK_FREE → status: not_compatible.
- If product contains bacon, ham, lard, prosciutto, pancetta, pork-derived gelatin, pork fat, or pork broth and restriction is PORK_FREE → status: not_compatible.
- If product contains gelatin, animal fat, shortening, meat stock, sausage, salami, or pepperoni with unclear pork source and restriction is PORK_FREE → status: unclear.
- For VEGETARIAN: cheese may be unclear if rennet type is unknown.
- For PALEO: processed additives may make compatibility unclear only when actually present and relevant.

canIHaveThis policy:
- canIHaveThis.can is a practical user-facing recommendation, not a certification guarantee.
- If a selected allergy is detected as present, can must be false.
- If a selected restriction is not_compatible, can must be false.
- If a selected restriction has status requires_certification, can should usually be true, but the reason must clearly say the user should verify the relevant certification before consuming.
- If a selected restriction has status unclear, can can be true when the risk is low or theoretical, but the reason must mention what to check.
- If all selected restrictions/allergies are compatible, can should be true.
- Do not set can=false only because certification might theoretically be needed.
- Do not set can=false for simple olive oil, plain fish, sardines in oil/brine/tomato/water, fruit, vegetables, grains, legumes, nuts, or seeds unless there is a concrete conflict with selected allergies/restrictions.
- Do not mention certification in canIHaveThis.reason unless the profile has a selected restriction where certification is actually relevant.
- For unclear PORK_FREE cases, use wording like: "Yes, but check whether the gelatin is pork-free if that matters for you."
- Keep reason in English and 1-2 short sentences.

confidence must be a number from 0 to 1.
ingredients must be an array of exact ingredient strings from the product data IN ENGLISH.
evidence must be a non-empty array of short strings.`;
}

async function analyzeWithAI(
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
  profiles: ProfileInputForScoring[],
  translatedIngredients: TranslatedIngredients,
): Promise<AiAnalyzeV2Output | null> {
  try {
    const model = new ChatOpenAI({ modelName: AI_MODEL });
    const structured = model.withStructuredOutput(aiAnalyzeV2OutputSchema);
    const userPrompt = buildAiAnalysisPrompt(product, profiles, translatedIngredients);

    const result = await structured.invoke([
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: userPrompt },
    ]);

    return aiAnalyzeV2OutputSchema.parse(result);
  } catch (err) {
    console.error('[ProductAnalyzeV2] AI analysis failed:', err);
    return null;
  }
}

function validateAndNormalizeAiResult(
  raw: AiAnalyzeV2Output | null,
  profiles: ProfileInputForScoring[],
): { result: AiProductAnalyzeV2Result; unscopedReasonProfileIds: Set<string> } {
  const unscopedReasonProfileIds = new Set<string>();

  const fallbackResult: AiProductAnalyzeV2Result = {
    product: {
      role: FALLBACK_ROLE,
      confidence: 0,
      evidence: ['AI response was invalid. Falling back to generic_food.'],
    },
    profileInfo: [],
  };

  if (
    !raw ||
    !raw.product ||
    !raw.product.role ||
    raw.product.confidence === undefined ||
    !Array.isArray(raw.product.evidence) ||
    !Array.isArray(raw.profileInfo)
  ) {
    return { result: fallbackResult, unscopedReasonProfileIds };
  }

  const validatedProfileInfo: AiProfileInfo[] = profiles.map((profile) => {
    const aiProfile = raw.profileInfo.find(
      (p) => p.profileId === profile.profileId && p.profileType === profile.profileType,
    );

    if (!aiProfile) {
      return buildFallbackProfileInfo(profile);
    }

    const canIHaveThis =
      aiProfile.canIHaveThis &&
      typeof aiProfile.canIHaveThis.can === 'boolean' &&
      typeof aiProfile.canIHaveThis.reason === 'string' &&
      aiProfile.canIHaveThis.reason.trim().length > 0
        ? { can: aiProfile.canIHaveThis.can, reason: aiProfile.canIHaveThis.reason.trim() }
        : { can: false, reason: 'I cannot confirm this product is suitable for you.' };

    const allergenDetections = (aiProfile.allergenDetections ?? [])
      .filter((d) => {
        if (!VALID_ALLERGY_SET.has(d.allergy)) return false;
        if (typeof d.confidence !== 'number' || d.confidence < 0 || d.confidence > 1) return false;
        return true;
      })
      .map((d) => ({
        ...d,
        ingredients: Array.isArray(d.ingredients) ? d.ingredients : [],
        evidence: Array.isArray(d.evidence) ? d.evidence : [],
      }));

    const restrictionDetections = (aiProfile.restrictionDetections ?? [])
      .filter((d) => {
        if (!VALID_RESTRICTION_SET.has(d.restriction)) return false;
        if (!VALID_RESTRICTION_STATUS_SET.has(d.status)) return false;
        if (typeof d.confidence !== 'number' || d.confidence < 0 || d.confidence > 1) return false;
        return true;
      })
      .map((d) => ({
        ...d,
        ingredients: Array.isArray(d.ingredients) ? d.ingredients : [],
        evidence: Array.isArray(d.evidence) ? d.evidence : [],
      }));

    // Scope filter: keep only detections for allergies/restrictions the profile actually has
    const allowedAllergies = new Set(profile.allergies);
    const scopedAllergenDetections = allergenDetections.filter((d) =>
      allowedAllergies.has(d.allergy),
    );

    const allowedRestrictions = new Set(profile.restrictions);
    const scopedRestrictionDetections = restrictionDetections.filter((d) =>
      allowedRestrictions.has(d.restriction),
    );

    // Log warning if AI returned out-of-scope detections
    const droppedAllergens = allergenDetections.filter((d) => !allowedAllergies.has(d.allergy));
    const droppedRestrictions = restrictionDetections.filter(
      (d) => !allowedRestrictions.has(d.restriction),
    );
    if (droppedAllergens.length > 0 || droppedRestrictions.length > 0) {
      console.warn(`[ProductAnalyzeV2] Out-of-scope AI detections dropped`, {
        profileId: profile.profileId,
        droppedAllergenDetections: droppedAllergens.map((d) => d.allergy),
        droppedRestrictionDetections: droppedRestrictions.map((d) => d.restriction),
      });
      unscopedReasonProfileIds.add(profile.profileId);
    }

    return {
      profileType: aiProfile.profileType,
      profileId: aiProfile.profileId,
      displayName: aiProfile.displayName ?? profile.displayName,
      allergenDetections: scopedAllergenDetections,
      restrictionDetections: scopedRestrictionDetections,
      canIHaveThis,
      uncertaintyFlags: Array.isArray(aiProfile.uncertaintyFlags) ? aiProfile.uncertaintyFlags : [],
    };
  });

  return {
    result: {
      product: {
        role: raw.product.role as ProductRole,
        confidence: raw.product.confidence,
        evidence: raw.product.evidence,
      },
      profileInfo: validatedProfileInfo,
    },
    unscopedReasonProfileIds,
  };
}

function buildFallbackProfileInfo(profile: ProfileInputForScoring): AiProfileInfo {
  return {
    profileType: profile.profileType,
    profileId: profile.profileId,
    displayName: profile.displayName,
    allergenDetections: [],
    restrictionDetections: [],
    canIHaveThis: {
      can: false,
      reason:
        'I cannot confirm this product is suitable for you because profile-specific AI analysis was not returned.',
    },
    uncertaintyFlags: [
      {
        type: 'low_confidence',
        message: 'AI did not return profile analysis for this profile.',
      },
    ],
  };
}

function resolveProductRole(
  aiProduct: AiProductAnalyzeV2Result['product'],
  normalizedProduct: ReturnType<typeof normalizeOpenFoodFactsProduct>,
): RoleResult {
  if (PRODUCT_ROLE_SET.has(aiProduct.role) && aiProduct.confidence >= MIN_AI_CONFIDENCE) {
    const isValid = validateProductRole(aiProduct.role, normalizedProduct);
    return {
      value: isValid ? aiProduct.role : FALLBACK_ROLE,
      source: 'ai',
      confidence: aiProduct.confidence,
      validated: isValid,
      evidence: aiProduct.evidence,
    };
  }

  return {
    value: FALLBACK_ROLE,
    source: 'fallback',
    confidence: aiProduct.confidence,
    validated: true,
    evidence:
      aiProduct.confidence < MIN_AI_CONFIDENCE
        ? [`AI confidence ${aiProduct.confidence.toFixed(2)} below threshold, fallback applied`]
        : ['AI classification unavailable, fallback applied'],
  };
}

function isFamilyAnalysisEnabled(
  subscriptionStatus: string | null | undefined,
  subscriptionExpiry: Date | null | undefined,
): boolean {
  return (
    subscriptionStatus === 'active' && (!subscriptionExpiry || subscriptionExpiry > new Date())
  );
}

function buildProfileAnalysis(
  profile: ProfileInputForScoring,
  role: RoleResult,
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
  nutritionResult: ReturnType<typeof calculateNutritionScore>,
  aiProfileInfo: AiProfileInfo | null,
): ProfileAnalysisResult {
  const safety = calculateSafetyScore(profile, product, aiProfileInfo);
  const goalFit = calculateGoalFitScore(profile.mainGoal, role.value, product);
  const scoreReasons = buildProfileScoreReasons({
    product,
    role: role.value,
    safety,
    aiProfileInfo,
  });
  const overall = calculateOverallScore(safety, goalFit, nutritionResult);

  return {
    profileType: profile.profileType,
    profileId: profile.profileId,
    displayName: profile.displayName,
    role,
    safety,
    goalFit,
    nutrition: nutritionResult,
    positives: scoreReasons.positives,
    negatives: scoreReasons.negatives,
    overall,
  };
}

function buildProfileAi(aiProfileInfo: AiProfileInfo | null): AnalyzeBarcodeV2ProfileResult['ai'] {
  const canIHaveThis: AnalyzeBarcodeV2ProfileResult['ai']['canIHaveThis'] =
    aiProfileInfo?.canIHaveThis ?? {
      can: false,
      reason: 'I cannot confirm this product is suitable for you.',
    };

  return {
    allergenDetections: aiProfileInfo?.allergenDetections ?? [],
    restrictionDetections: aiProfileInfo?.restrictionDetections ?? [],
    canIHaveThis,
  };
}

function buildProfileResult(
  profile: ProfileInputForScoring,
  analysis: ProfileAnalysisResult,
  aiProfileInfo: AiProfileInfo | null,
): AnalyzeBarcodeV2ProfileResult {
  return {
    profileId: profile.profileId,
    type: profile.profileType,
    displayName: profile.displayName,
    analysis: {
      safety: analysis.safety,
      goalFit: analysis.goalFit,
      nutrition: analysis.nutrition,
      positives: analysis.positives,
      negatives: analysis.negatives,
      overall: analysis.overall,
    },
    ai: buildProfileAi(aiProfileInfo),
  };
}

function buildSafetyBasedCanIHaveThis(safety: SafetyResult): { can: boolean; reason: string } {
  if (safety.status === 'avoid') {
    return {
      can: false,
      reason: safety.reasons[0] ?? 'No, this product does not appear suitable for your profile.',
    };
  }
  if (safety.status === 'caution') {
    return {
      can: false,
      reason:
        safety.reasons[0] ?? 'You may need to be cautious with this product based on your profile.',
    };
  }
  return {
    can: true,
    reason:
      'Yes, this appears suitable for your selected preferences. Check portion size and nutrition details if relevant.',
  };
}

export async function analyzeBarcodeNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { barcode, userId } = state;

  console.log(`[ProductAnalyzeV2] Starting barcode analysis — barcode=${barcode} userId=${userId}`);

  // 1. Fetch product from Open Food Facts
  console.log(`[ProductAnalyzeV2] Fetching product from OpenFoodFacts — barcode=${barcode}`);
  let rawProduct: NormalizedProduct | null;
  try {
    rawProduct = await lookupBarcode(barcode);
  } catch (err) {
    if (err instanceof OpenFoodFactsLookupError) {
      console.error(
        `[ProductAnalyzeV2] OFF lookup error — code=${err.code} message=${err.message}`,
      );
      throw ApiError.badGateway(
        'Product data service is temporarily unavailable',
        'OFF_UPSTREAM_ERROR',
      );
    }
    throw err;
  }

  if (!rawProduct) {
    console.warn(`[ProductAnalyzeV2] Product not found — barcode=${barcode}`);
    throw ApiError.notFound('Product not found for this barcode', 'PRODUCT_NOT_FOUND');
  }

  console.log(
    `[ProductAnalyzeV2] Product fetched — name="${rawProduct.product_name ?? 'unknown'}"`,
  );

  // 2. Normalize product to V2 format
  const product = normalizeOpenFoodFactsProduct(barcode, rawProduct);
  console.log(
    `[ProductAnalyzeV2] Product normalized — ingredients=${product.ingredients.length} allergens=${product.allergens.length}`,
  );

  // 3. Load user with subscription and profile
  console.log(`[ProductAnalyzeV2] Loading user — userId=${userId}`);
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
  const mainProfile: ProfileInputForScoring = {
    profileId: user.profile?.id ?? userId,
    profileType: 'user',
    displayName: user.name ?? null,
    mainGoal: (user.profile?.mainGoal as MainGoal | null) ?? null,
    restrictions: user.profile?.restrictions ?? [],
    allergies: user.profile?.allergies ?? [],
    otherAllergiesText: user.profile?.otherAllergiesText ?? null,
  };

  const familyProfiles: ProfileInputForScoring[] = familyEnabled
    ? user.familyMembers.map((member) => ({
        profileId: member.id,
        profileType: 'family_member' as const,
        displayName: member.name,
        mainGoal: (member.mainGoal as MainGoal | null) ?? null,
        restrictions: member.restrictions ?? [],
        allergies: member.allergies ?? [],
        otherAllergiesText: member.otherAllergiesText ?? null,
      }))
    : [];

  const allProfiles: ProfileInputForScoring[] = [mainProfile, ...familyProfiles];

  console.log(
    `[ProductAnalyzeV2] Main profile — goal=${mainProfile.mainGoal} restrictions=${mainProfile.restrictions.length} allergies=${mainProfile.allergies.length}`,
  );

  // 5. Translate ingredients to English for better AI analysis
  const translatedIngredients = await translateIngredientsToEnglish(product.ingredients, null);

  // 6. Classify product role and detect profile allergens/restrictions via AI (once per product+profiles)
  console.log(
    `[ProductAnalyzeV2] Running AI analysis — barcode=${barcode} profiles=${allProfiles.length}`,
  );
  const rawAiOutput = await analyzeWithAI(product, allProfiles, translatedIngredients);
  const { result: aiResult, unscopedReasonProfileIds } = validateAndNormalizeAiResult(
    rawAiOutput,
    allProfiles,
  );

  console.log(`[ProductAnalyzeV2] Ai result], ${JSON.stringify(aiResult, null, 2)}`);

  // 7. Resolve product role from AI result
  const roleResult = resolveProductRole(aiResult.product, product);

  console.log(
    `[ProductAnalyzeV2] Final role — role=${roleResult.value} source=${roleResult.source} confidence=${roleResult.confidence} validated=${roleResult.validated}`,
  );

  // 8. Calculate nutrition score once (product-level)
  const nutritionResult = calculateNutritionScore(product, roleResult.value);
  console.log(`[ProductAnalyzeV2] Nutrition score — score=${nutritionResult.score}`);

  // 9. Calculate scores for main profile using AI profile info
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

  // Override canIHaveThis reason if AI returned out-of-scope detections for main profile
  if (unscopedReasonProfileIds.has(mainProfile.profileId)) {
    const overriddenCanIHaveThis = buildSafetyBasedCanIHaveThis(mainProfileAnalysis.safety);
    const aiProfileForDebug = aiResult.profileInfo.find(
      (p) => p.profileId === mainProfile.profileId && p.profileType === 'user',
    );
    if (aiProfileForDebug) {
      aiProfileForDebug.canIHaveThis = overriddenCanIHaveThis;
    }
  }

  // 10. Calculate scores for family members if subscription is active
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

    // Override canIHaveThis reason if AI returned out-of-scope detections for this member
    if (unscopedReasonProfileIds.has(memberProfile.profileId)) {
      const overriddenCanIHaveThis = buildSafetyBasedCanIHaveThis(memberAnalysis.safety);
      const aiProfileForDebug = aiResult.profileInfo.find(
        (p) => p.profileId === memberProfile.profileId && p.profileType === 'family_member',
      );
      if (aiProfileForDebug) {
        aiProfileForDebug.canIHaveThis = overriddenCanIHaveThis;
      }
    }

    profileResults.push(buildProfileResult(memberProfile, memberAnalysis, memberAiProfileInfo));
  }

  // 11. Build response
  const response: AnalyzeBarcodeV2Response = {
    product: {
      name: product.name,
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

  console.log(JSON.stringify(response, null, 2));

  return { result: response };
}
