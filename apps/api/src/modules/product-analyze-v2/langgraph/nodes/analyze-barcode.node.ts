import type { NormalizedProduct } from '@acme/shared';
import type { MainGoal, SafetyResult } from '../../types/scoring.types.js';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { prisma } from '../../../product-analyze/lib/prisma.js';
import {
  lookupBarcode,
  OpenFoodFactsLookupError,
} from '../../../product-analyze/services/openfoodfacts-client.js';
import { createProduct } from '../../../product-analyze/repositories/productRepository.js';
import { findProductIdByBarcode } from '../../../product-analyze/repositories/scanRepository.js';
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
import { ApiError } from '../../../../shared/errors/api-error.js';
import {
  translateIngredientsToEnglish,
  type TranslatedIngredients,
} from '../../utils/translate-ingredients.util.js';

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
  'semi_compatible',
  'not_compatible',
  'unclear',
  'requires_certification',
]);

const ALLERGY_SUMMARY_LABELS: Record<(typeof VALID_ALLERGIES_LIST)[number], string> = {
  PEANUTS: 'peanut allergy',
  TREE_NUTS: 'tree nut allergy',
  GLUTEN: 'gluten allergy',
  DAIRY: 'dairy allergy',
  SOY: 'soy allergy',
  EGGS: 'egg allergy',
  SHELLFISH: 'shellfish allergy',
  SESAME: 'sesame allergy',
  OTHER: 'custom allergy',
};

const RESTRICTION_SUMMARY_LABELS: Record<(typeof VALID_RESTRICTIONS_LIST)[number], string> = {
  VEGAN: 'vegan diet',
  VEGETARIAN: 'vegetarian diet',
  KETO: 'keto diet',
  PALEO: 'paleo diet',
  GLUTEN_FREE: 'gluten-free',
  DAIRY_FREE: 'dairy-free',
  PORK_FREE: 'pork-free',
  NUT_FREE: 'nut-free',
};

const RESTRICTION_STATUS_SUMMARY_LABELS: Record<string, string> = {
  compatible: 'compatible',
  semi_compatible: 'partly compatible',
  not_compatible: 'not compatible',
  unclear: 'unclear',
  requires_certification: 'needs certification verification',
};

const PRODUCT_ROLE_SUMMARY_LABELS: Record<string, string> = Object.fromEntries(
  VALID_PRODUCT_ROLES.map((role) => [role, role.replace(/_/g, ' ')]),
);

const SUMMARY_ENUM_LABELS: Record<string, string> = {
  ...ALLERGY_SUMMARY_LABELS,
  ...RESTRICTION_SUMMARY_LABELS,
  ...RESTRICTION_STATUS_SUMMARY_LABELS,
  ...PRODUCT_ROLE_SUMMARY_LABELS,
};

const SUMMARY_ENUM_PATTERN = new RegExp(
  `(^|[^A-Za-z0-9_])(${Object.keys(SUMMARY_ENUM_LABELS)
    .sort((a, b) => b.length - a.length)
    .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})(?=$|[^A-Za-z0-9_])`,
  'gi',
);

export function normalizeOverallSummaryText(summary: string): string {
  return summary
    .replace(SUMMARY_ENUM_PATTERN, (match, prefix: string, token: string) => {
      const label = SUMMARY_ENUM_LABELS[token] ?? SUMMARY_ENUM_LABELS[token.toUpperCase()] ?? token;
      return `${prefix}${label}`;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

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
  status: z.enum([
    'compatible',
    'semi_compatible',
    'not_compatible',
    'unclear',
    'requires_certification',
  ]),
  compatible: z.boolean().nullable().optional(),
  source: z.enum(['off_tag', 'ingredient_text', 'certification_tag', 'ai_inference']),
  confidence: z.number().min(0).max(1),
  ingredients: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
});

const profileIngredientSchema = z.object({
  name: z.string().min(1),
  compatible: z.boolean(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).default([]),
});

const profileInfoSchema = z.object({
  profileType: z.enum(['user', 'family_member']),
  profileId: z.string(),
  displayName: z.string().nullable().optional(),
  allergenDetections: z.array(allergenDetectionSchema).default([]),
  restrictionDetections: z.array(restrictionDetectionSchema).default([]),
  ingredients: z.array(profileIngredientSchema).default([]),
  overallSummary: z.string().nullable().optional(),
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

type IngredientCompatibilityItem = {
  name: string;
  compatible: boolean;
  confidence: number;
  evidence: string[];
};
type AiAllergenDetectionOutput = {
  allergy: string;
  detected: boolean;
  source: 'off_allergen_tag' | 'off_trace_tag' | 'ingredient_text' | 'ai_inference';
  confidence: number;
  ingredients: string[];
  evidence: string[];
};
type AiRestrictionDetectionOutput = {
  restriction: string;
  status:
    | 'compatible'
    | 'semi_compatible'
    | 'not_compatible'
    | 'unclear'
    | 'requires_certification';
  compatible?: boolean | null;
  source: 'off_tag' | 'ingredient_text' | 'certification_tag' | 'ai_inference';
  confidence: number;
  ingredients: string[];
  evidence: string[];
};
type AiProfileInfoWithIngredients = {
  profileType: 'user' | 'family_member';
  profileId: string;
  displayName?: string | null;
  allergenDetections: AiAllergenDetectionOutput[];
  restrictionDetections: AiRestrictionDetectionOutput[];
  ingredients: IngredientCompatibilityItem[];
  overallSummary?: string | null;
  canIHaveThis: {
    can: boolean;
    reason: string;
  };
  uncertaintyFlags: Array<{
    type:
      | 'ambiguous_ingredient'
      | 'missing_ingredients'
      | 'missing_allergen_data'
      | 'low_confidence'
      | 'unknown_restriction_compatibility';
    message: string;
  }>;
};
type AiAnalyzeV2Output = {
  product: {
    role: string;
    confidence: number;
    evidence: string[];
  };
  profileInfo: AiProfileInfoWithIngredients[];
};
type ValidatedAiAnalyzeV2Result = {
  product: AiProductAnalyzeV2Result['product'];
  profileInfo: AiProfileInfoWithIngredients[];
};
type BuildProfileAiResult = {
  allergenDetections: AnalyzeBarcodeV2ProfileResult['ai']['allergenDetections'];
  restrictionDetections: AnalyzeBarcodeV2ProfileResult['ai']['restrictionDetections'];
  ingredients: IngredientCompatibilityItem[];
  canIHaveThis: AnalyzeBarcodeV2ProfileResult['ai']['canIHaveThis'];
};

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
    ? `Ingredients (English — use these exact English names in allergenDetections.ingredients and restrictionDetections.ingredients, and use concise English names in ingredients[].name): ${ingredientsDisplay}\nIngredients (original — reference only, do not copy these strings into output): ${translatedIngredients.ingredientsOriginal.join(', ')}`
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
      lines.push(
        `  otherAllergiesText (specific match only — do not generalize to related allergens): ${p.otherAllergiesText}`,
      );
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
  "ingredients": ProfileIngredient[],
  "overallSummary": string,
  "canIHaveThis": {
    "can": boolean,
    "reason": string
  },
  "uncertaintyFlags": UncertaintyFlag[]
}

Each ProfileIngredient item must include:
{
  "name": string,
  "compatible": boolean,
  "confidence": number,
  "evidence": string[]
}

The canIHaveThis.reason must be in English and must be exactly 1 very short sentence. User-facing and practical. Do not mention AI, scores, confidence values, or enum names.
The overallSummary must be in English and must be 3 short sentences. User-facing and practical. Do not mention AI, scores, confidence values, or enum names.

Allowed product.role values: ${rolesStr}

Allowed allergy values: ${allergiesStr}
Allowed restriction values: ${restrictionsStr}

Allergen detection sources: off_allergen_tag, off_trace_tag, ingredient_text, ai_inference
Restriction detection sources: off_tag, ingredient_text, certification_tag, ai_inference
Restriction statuses: compatible, semi_compatible, not_compatible, unclear, requires_certification

SCOPE RULE — VERY IMPORTANT:
For each profile, analyze ONLY the allergies listed in that profile's allergies array and ONLY the restrictions listed in that profile's restrictions array.

Do not analyze allergies that are not present in the profile.
Do not analyze restrictions that are not present in the profile.

The enum lists above are allowed output values only. They are NOT a checklist to analyze every item.

CUSTOM ALLERGY RULES FOR OTHER:
- When a profile's allergies array includes OTHER and otherAllergiesText is provided, treat otherAllergiesText as the profile's custom allergy details.
- Match the custom allergy narrowly and specifically against the product ingredients, allergens, and traces.
- A specific custom allergen matches only itself, its simple singular/plural form, or an explicit alias clearly stated in the product data.
- Do NOT generalize a specific custom allergen to sibling ingredients from the same family or category.
- Example: almond matches almond or almonds only. It does NOT match cashew, walnut, hazelnut, pistachio, tree nuts, mixed nuts, or other nuts unless almond itself is explicitly present.
- Example: shrimp does NOT match fish. Sesame does NOT match other seeds. Oat does NOT match wheat.
- Ignore custom allergy details that are not real, specific food allergens or plausible sensitivities.
- Return allergy: OTHER with detected:true ONLY when the product data contains affirmative evidence for the custom allergy.
- Never return detected:true when the evidence says the custom allergen is not listed, not found, absent, missing, or not directly triggered.
- If the evidence says the custom allergen is not present, detected must NOT be true.
- If the custom allergy is not detected, omit the allergenDetections item for OTHER instead of returning detected:true with negative evidence.
- If the custom allergy is detected, return an allergenDetections item with allergy: OTHER and cite the concrete matching English ingredient, allergen, trace, or evidence from the product data.
- Do not guess or invent the custom allergen in allergenDetections[].ingredients. Only include it when that exact custom allergen text or its simple singular/plural form appears in the product data.
- allergenDetections[].ingredients must contain product ingredients/allergens/traces only. Never put the custom allergy text itself there unless it is also present in product data.
- If OTHER is not selected for a profile, do not analyze otherAllergiesText for that profile.

If profile.allergies is empty, return: "allergenDetections": []
If profile.restrictions is empty, return: "restrictionDetections": []
If the product ingredient list is unavailable, return: "ingredients": []
Always return a non-empty overallSummary for every profile.

Do not return detected:false entries for allergies the user does not have.
Do not return compatible:true entries for restrictions the user did not select.

For every profile, analyze the ingredient list and return one ProfileIngredient entry per listed ingredient, in the same order as the provided English ingredients when possible.
ingredients[].name must be a short English display name for that ingredient.
Set ingredients[].compatible to false when that ingredient directly conflicts with the profile's selected allergies/restrictions or creates a concrete caution trigger for that profile.
Set ingredients[].compatible to true when that ingredient is compatible or neutral for the profile.
Do not omit safe or neutral ingredients just because they are compatible.
Do not add ingredients that are not grounded in the provided product ingredient list.
ingredients[].evidence must be a non-empty array of short English strings.

canIHaveThis.reason must only reference:
- selected allergies of this profile,
- selected restrictions of this profile,
- product-level nutrition or portion guidance,
- product role.
It must NOT mention allergies or restrictions that are not selected by this profile.
It must directly answer whether the user should take/eat this product.
It must start with either "Yes –" or "No –".
Keep it under 20 words when possible.
Prefer very short recommendation patterns such as:
- "Yes – good everyday option."
- "Yes – fine in small amounts."
- "Yes – okay occasionally, but keep portions modest."
- "No – it conflicts with your profile."
- "No – better avoid this one."
- "No – not a good fit for your needs."
When the product is generally fine but calorie-dense or nutritionally heavy, prefer short portion guidance such as "in small amounts", "occasionally", or "keep portions modest".
When the product is clearly unsuitable, prefer a short No-answer instead of a long explanation.

overallSummary must be a short profile-level recommendation summary.
It should sound like a natural conclusion for the profile after considering the selected allergies, selected restrictions, product role, and practical nutrition trade-offs.
It may mention caution, clear risk, good fit, reasonable choice, or portion awareness when relevant.
It must not mention any allergy or restriction that is not selected by this profile.
It must not use bullet points or markdown.
It must not mention AI, scores, confidence values, or enum names (convert it to human-readable text).
Keep it to exactly 3 short sentences.

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
- semi_compatible: product data explicitly mentions traces, cross-contamination, or may-contain warnings for the restricted item, but the restricted item is not listed as a direct ingredient.
- unclear/caution: ingredient is ambiguous and commonly contains the restricted item, or the product data is incomplete in a way that prevents a better determination.
- Do not warn if restriction is not selected by the profile.
- Do not infer cross-contamination if product data does not mention it.

Trace handling policy:
- Use semi_compatible only for concrete trace/cross-contamination risk that is explicitly mentioned in product data.
- Do not use compatible when there is an explicit trace warning for a selected restriction such as NUT_FREE, GLUTEN_FREE, or DAIRY_FREE.
- For NUT_FREE, if nuts are listed in traces or a may-contain warning, return semi_compatible, not compatible.
- For semi_compatible, prefer an empty ingredients array when the risk comes from trace warnings rather than a specific listed ingredient.

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
- If a selected restriction has status semi_compatible, can can be true, but the reason must clearly mention the trace or cross-contamination risk.
- If a selected restriction has status requires_certification, can should usually be true, but the reason must clearly say the user should verify the relevant certification before consuming.
- If a selected restriction has status unclear, can can be true when the risk is low or theoretical, but the reason must mention what to check.
- If all selected restrictions/allergies are compatible, can should be true.
- Do not set can=false only because certification might theoretically be needed.
- Do not set can=false for simple olive oil, plain fish, sardines in oil/brine/tomato/water, fruit, vegetables, grains, legumes, nuts, or seeds unless there is a concrete conflict with selected allergies/restrictions.
- Do not mention certification in canIHaveThis.reason unless the profile has a selected restriction where certification is actually relevant.
- For unclear PORK_FREE cases, prefer short wording like: "Yes – check the gelatin source first."
- Keep reason in English and exactly 1 very short sentence.

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

    return aiAnalyzeV2OutputSchema.parse(result) as AiAnalyzeV2Output;
  } catch (err) {
    console.error('[ProductAnalyzeV2] AI analysis failed:', err);
    return null;
  }
}

const NEGATIVE_EVIDENCE_PATTERN =
  /\b(?:no|none|without|absent|missing|unlisted)\b|\bnot\s+(?:listed|found|present|detected|triggered|directly\s+triggered)\b|\bdoes\s+not\s+(?:contain|list|show|include|appear|match)\b|\b(?:isn't|is\s+not)\s+(?:listed|present|included|detected|triggered)\b|\bfree\s+from\b/iu;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeGroundingText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const uniqueNormalizedValues = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeGroundingText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(value.trim());
  }

  return result;
};

const splitCustomAllergyEntries = (value: string | null | undefined): string[] =>
  uniqueNormalizedValues(
    (value ?? '')
      .split(/\s*[,;/]\s*/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );

const normalizeCustomAllergyEntry = (value: string): string =>
  normalizeGroundingText(value)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const singularizeCustomWord = (word: string): string => {
  if (word.endsWith('ies') && word.length > 3) {
    return `${word.slice(0, -3)}y`;
  }

  if (word.endsWith('ses') || word.endsWith('xes')) {
    return word.slice(0, -2);
  }

  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 2) {
    return word.slice(0, -1);
  }

  return word;
};

const pluralizeCustomWord = (word: string): string => {
  if (word.endsWith('y') && word.length > 1 && !/[aeiou]y$/i.test(word)) {
    return `${word.slice(0, -1)}ies`;
  }

  if (/(s|x|z|ch|sh)$/i.test(word)) {
    return `${word}es`;
  }

  if (word.endsWith('s')) {
    return word;
  }

  return `${word}s`;
};

const buildCustomAllergyVariants = (entry: string): string[] => {
  const normalizedEntry = normalizeCustomAllergyEntry(entry);
  if (!normalizedEntry) {
    return [];
  }

  const words = normalizedEntry.split(' ').filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const lastWord = words[words.length - 1];
  const singularVariant = [...words.slice(0, -1), singularizeCustomWord(lastWord)].join(' ');
  const pluralVariant = [...words.slice(0, -1), pluralizeCustomWord(lastWord)].join(' ');

  return uniqueNormalizedValues([normalizedEntry, singularVariant, pluralVariant]);
};

const textContainsCustomAllergyEntry = (text: string, entry: string): boolean => {
  const normalizedText = normalizeCustomAllergyEntry(text);
  if (!normalizedText) {
    return false;
  }

  return buildCustomAllergyVariants(entry).some((variant) => {
    const pattern = new RegExp(`\\b${escapeRegExp(variant).replace(/\s+/g, '\\s+')}\\b`, 'iu');
    return pattern.test(normalizedText);
  });
};

const hasSpecificCustomAllergyMatch = (
  detection: AiAllergenDetectionOutput,
  customEntries: string[],
): boolean => {
  if (detection.allergy !== 'OTHER' || !detection.detected) {
    return true;
  }

  if (customEntries.length === 0) {
    return false;
  }

  const evidenceTexts = [...detection.ingredients, ...detection.evidence];
  return evidenceTexts.some((text) =>
    customEntries.some((entry) => textContainsCustomAllergyEntry(text, entry)),
  );
};

const buildAllergenGroundingValues = (
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
  translatedIngredients: TranslatedIngredients,
): string[] =>
  uniqueNormalizedValues([
    ...product.ingredients,
    ...product.allergens,
    ...product.traces,
    ...translatedIngredients.ingredientsEnglish,
  ]);

const textContainsGroundedValue = (text: string, groundingValues: string[]): boolean => {
  const normalizedText = normalizeGroundingText(text);
  if (!normalizedText) return false;

  return groundingValues.some((value) => {
    const normalizedValue = normalizeGroundingText(value);
    return (
      normalizedValue.length > 1 &&
      (normalizedText.includes(normalizedValue) || normalizedValue.includes(normalizedText))
    );
  });
};

const filterGroundedIngredients = (ingredients: string[], groundingValues: string[]): string[] =>
  uniqueNormalizedValues(
    ingredients.filter((ingredient) => textContainsGroundedValue(ingredient, groundingValues)),
  );

const normalizeAllergenDetection = (
  detection: AiAllergenDetectionOutput,
  groundingValues: string[],
): AiAllergenDetectionOutput | null => {
  const evidence = Array.isArray(detection.evidence) ? detection.evidence : [];
  const evidenceText = evidence.join(' ');
  const groundedIngredients = filterGroundedIngredients(detection.ingredients, groundingValues);

  if (!detection.detected) {
    return { ...detection, ingredients: groundedIngredients, evidence };
  }

  if (NEGATIVE_EVIDENCE_PATTERN.test(evidenceText)) {
    return null;
  }

  const hasGroundedEvidence =
    groundedIngredients.length > 0 ||
    evidence.some((item) => textContainsGroundedValue(item, groundingValues));

  if (!hasGroundedEvidence) {
    return null;
  }

  return { ...detection, ingredients: groundedIngredients, evidence };
};

function validateAndNormalizeAiResult(
  raw: AiAnalyzeV2Output | null,
  profiles: ProfileInputForScoring[],
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
  translatedIngredients: TranslatedIngredients,
): { result: ValidatedAiAnalyzeV2Result; unscopedReasonProfileIds: Set<string> } {
  const unscopedReasonProfileIds = new Set<string>();
  const groundingValues = buildAllergenGroundingValues(product, translatedIngredients);

  const fallbackResult: ValidatedAiAnalyzeV2Result = {
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

  const validatedProfileInfo: AiProfileInfoWithIngredients[] = profiles.map((profile) => {
    const aiProfile = raw.profileInfo.find(
      (p) => p.profileId === profile.profileId && p.profileType === profile.profileType,
    );

    if (!aiProfile) {
      return buildFallbackProfileInfo(profile);
    }

    const canIHaveThis =
      aiProfile.canIHaveThis.reason.trim().length > 0
        ? { can: aiProfile.canIHaveThis.can, reason: aiProfile.canIHaveThis.reason.trim() }
        : { can: false, reason: 'I cannot confirm this product is suitable for you.' };

    const overallSummary =
      typeof aiProfile.overallSummary === 'string' && aiProfile.overallSummary.trim().length > 0
        ? normalizeOverallSummaryText(aiProfile.overallSummary)
        : null;
    const customAllergyEntries = splitCustomAllergyEntries(profile.otherAllergiesText);

    const rawValidAllergenDetections = (aiProfile.allergenDetections ?? []).filter(
      (d) => VALID_ALLERGY_SET.has(d.allergy) && d.confidence >= 0 && d.confidence <= 1,
    );

    const normalizedAllergenDetections = rawValidAllergenDetections
      .map((d) =>
        normalizeAllergenDetection(
          {
            ...d,
            ingredients: Array.isArray(d.ingredients) ? d.ingredients : [],
            evidence: Array.isArray(d.evidence) ? d.evidence : [],
          },
          groundingValues,
        ),
      )
      .filter((d): d is AiAllergenDetectionOutput => d !== null);

    const droppedCustomOtherDetections = normalizedAllergenDetections.filter(
      (d) => d.allergy === 'OTHER' && !hasSpecificCustomAllergyMatch(d, customAllergyEntries),
    );

    const allergenDetections = normalizedAllergenDetections.filter(
      (d) => d.allergy !== 'OTHER' || hasSpecificCustomAllergyMatch(d, customAllergyEntries),
    );

    const restrictionDetections = (aiProfile.restrictionDetections ?? [])
      .filter(
        (d) =>
          VALID_RESTRICTION_SET.has(d.restriction) &&
          VALID_RESTRICTION_STATUS_SET.has(d.status) &&
          d.confidence >= 0 &&
          d.confidence <= 1,
      )
      .map((d) => ({
        ...d,
        ingredients: Array.isArray(d.ingredients) ? d.ingredients : [],
        evidence: Array.isArray(d.evidence) ? d.evidence : [],
      }));

    const ingredients = (aiProfile.ingredients ?? [])
      .filter(
        (ingredient) =>
          ingredient.name.trim().length > 0 &&
          ingredient.confidence >= 0 &&
          ingredient.confidence <= 1,
      )
      .map((ingredient) => ({
        name: ingredient.name.trim(),
        compatible: ingredient.compatible,
        confidence: ingredient.confidence,
        evidence: Array.isArray(ingredient.evidence) ? ingredient.evidence : [],
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
    const invalidAllergenDetectionCount =
      rawValidAllergenDetections.length - allergenDetections.length;
    const droppedAllergens = allergenDetections.filter((d) => !allowedAllergies.has(d.allergy));
    const droppedRestrictions = restrictionDetections.filter(
      (d) => !allowedRestrictions.has(d.restriction),
    );
    if (
      invalidAllergenDetectionCount > 0 ||
      droppedCustomOtherDetections.length > 0 ||
      droppedAllergens.length > 0 ||
      droppedRestrictions.length > 0
    ) {
      console.warn(`[ProductAnalyzeV2] Invalid or out-of-scope AI detections dropped`, {
        profileId: profile.profileId,
        invalidAllergenDetectionCount,
        droppedCustomOtherDetections: droppedCustomOtherDetections.map((d) => ({
          ingredients: d.ingredients,
          evidence: d.evidence,
        })),
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
      ingredients,
      overallSummary,
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

function buildFallbackProfileInfo(profile: ProfileInputForScoring): AiProfileInfoWithIngredients {
  return {
    profileType: profile.profileType,
    profileId: profile.profileId,
    displayName: profile.displayName,
    allergenDetections: [],
    restrictionDetections: [],
    ingredients: [],
    overallSummary: null,
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
  aiProfileInfo: AiProfileInfoWithIngredients | null,
): ProfileAnalysisResult {
  const safety = calculateSafetyScore(profile, product, aiProfileInfo as AiProfileInfo | null);
  const goalFit = calculateGoalFitScore(profile.mainGoal, role.value, product);
  const scoreReasons = buildProfileScoreReasons({
    product,
    role: role.value,
    safety,
    aiProfileInfo: aiProfileInfo as AiProfileInfo | null,
  });
  const overall = calculateOverallScore(
    safety,
    goalFit,
    nutritionResult,
    aiProfileInfo?.overallSummary ?? null,
  );

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

function buildProfileAi(aiProfileInfo: AiProfileInfoWithIngredients | null): BuildProfileAiResult {
  const canIHaveThis: BuildProfileAiResult['canIHaveThis'] = aiProfileInfo?.canIHaveThis ?? {
    can: false,
    reason: 'I cannot confirm this product is suitable for you.',
  };

  return {
    allergenDetections: aiProfileInfo?.allergenDetections ?? [],
    restrictionDetections: aiProfileInfo?.restrictionDetections ?? [],
    ingredients: aiProfileInfo?.ingredients ?? [],
    canIHaveThis,
  };
}

function buildProfileResult(
  profile: ProfileInputForScoring,
  analysis: ProfileAnalysisResult,
  aiProfileInfo: AiProfileInfoWithIngredients | null,
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
    `[ProductAnalyzeV2] Running AI analysis — ${logContext} profiles=${allProfiles.length}`,
  );
  const rawAiOutput = await analyzeWithAI(product, allProfiles, translatedIngredients);
  const { result: aiResult, unscopedReasonProfileIds } = validateAndNormalizeAiResult(
    rawAiOutput,
    allProfiles,
    product,
    translatedIngredients,
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

  return response;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isAnalyzeBarcodeV2Response(value: unknown): value is AnalyzeBarcodeV2Response {
  if (!isRecord(value) || !isRecord(value.product) || !Array.isArray(value.profiles)) {
    return false;
  }

  const { product } = value;
  return (
    isStringArray(product.ingredients) &&
    isStringArray(product.allergens) &&
    isStringArray(product.traces) &&
    isStringArray(product.additives) &&
    isRecord(product.nutrition)
  );
}

function canReuseAnalysis(createdAt: Date, preferencesUpdatedAt: Date | null): boolean {
  return !preferencesUpdatedAt || createdAt > preferencesUpdatedAt;
}

export async function findReusableAnalyzedProductByBarcode(input: {
  barcode: string;
  userId: string;
}): Promise<AnalyzedProductByBarcodeResult | null> {
  const [user, scans] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { analysisPreferencesUpdatedAt: true },
    }),
    prisma.scan.findMany({
      where: {
        userId: input.userId,
        barcode: input.barcode,
        personalAnalysisStatus: 'completed',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        productId: true,
        createdAt: true,
        multiProfileResult: true,
      },
    }),
  ]);

  if (!user) {
    throw ApiError.unauthorized();
  }

  const reusableScan = scans.find(
    (scan) =>
      canReuseAnalysis(scan.createdAt, user.analysisPreferencesUpdatedAt) &&
      isAnalyzeBarcodeV2Response(scan.multiProfileResult),
  );

  if (!reusableScan || !isAnalyzeBarcodeV2Response(reusableScan.multiProfileResult)) {
    return null;
  }

  return {
    barcode: input.barcode,
    result: reusableScan.multiProfileResult,
    reusedExistingAnalysis: true,
    scanId: reusableScan.id,
    ...(reusableScan.productId ? { productId: reusableScan.productId } : {}),
  };
}

async function analyzeFreshProductByBarcode(input: {
  barcode: string;
  userId: string;
}): Promise<AnalyzedProductByBarcodeResult> {
  const { barcode, userId } = input;

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

  await createProduct(rawProduct);
  const productId = await findProductIdByBarcode(rawProduct.code);
  const result = await analyzeNormalizedProductForUser({
    product,
    userId,
    logContext: `barcode=${barcode}`,
  });

  return {
    barcode,
    result,
    reusedExistingAnalysis: false,
    ...(productId ? { productId } : {}),
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
