import type { NormalizedProduct } from '@acme/shared';
import type { MainGoal } from '../../types/scoring.types.js';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { prisma } from '../../../product-analyze/lib/prisma.js';
import {
  lookupBarcode,
  OpenFoodFactsLookupError,
} from '../../../product-analyze/services/openfoodfacts-client.js';
import { createProduct } from '../../../product-analyze/repositories/productRepository.js';
import { findProductIdByBarcode } from '../../../product-analyze/repositories/scanRepository.js';
import {
  hasEnoughProductInformation,
  normalizeOpenFoodFactsProduct,
} from '../../utils/normalize-open-food-facts-product.util.js';
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
import type {
  AiCanIHaveThisStatus,
  AiProfileInfo,
  AiProductAnalyzeV2Result,
} from '../../types/ai-analyze.types.js';
import { ApiError } from '../../../../shared/errors/api-error.js';

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

type ValidRestriction = (typeof VALID_RESTRICTIONS_LIST)[number];

const VALID_ALLERGY_SET = new Set(VALID_ALLERGIES_LIST as readonly string[]);
const VALID_RESTRICTION_SET = new Set(VALID_RESTRICTIONS_LIST as readonly string[]);
const VALID_RESTRICTION_STATUS_SET = new Set([
  'compatible',
  'semi_compatible',
  'not_compatible',
  'unclear',
  'requires_certification',
]);

const SHARED_FREE_FROM_RESTRICTION_RULES = `GLUTEN_FREE/DAIRY_FREE/NUT_FREE shared rules:
- not_compatible: relevant ingredient is clearly present.
- semi_compatible: only for ingredient-based partial compatibility, not traces.
- unclear/caution: ingredient is ambiguous and commonly contains the restricted item, or product data is incomplete in a way that prevents a better determination.
- Do not infer cross-contamination if product data does not mention it.
- Use traceDetections, not restrictionDetections, for explicit trace/cross-contamination warnings.`;

const FREE_FROM_RESTRICTIONS = new Set<ValidRestriction>(['GLUTEN_FREE', 'DAIRY_FREE', 'NUT_FREE']);

const RESTRICTION_PROMPT_RULES: Partial<Record<ValidRestriction, string>> = {
  VEGAN: `VEGAN rules:
- Vegan means no animal-derived ingredients at all.
- not_compatible: meat, fish/seafood, dairy, milk, yogurt, cheese, butter, cream, whey, casein, lactose, eggs, honey, gelatin, lard, collagen, carmine, animal-derived rennet, or clearly animal-derived enzymes.
- unclear: natural flavors could be animal-derived only when product context makes that plausible; rennet/enzymes with unspecified source; ambiguous additives like mono/diglycerides when relevant.
- compatible: simple plant products with no animal-derived ingredients and no concrete suspicious additives.
- Honey is not vegan. Yogurt, milk, cheese, butter, whey, casein, lactose, and eggs are not vegan.
- If VEGAN is selected and honey or yogurt is listed, return restrictionDetections with restriction: VEGAN and status: not_compatible.`,
  VEGETARIAN: `VEGETARIAN rules:
- Vegetarian is NOT the same as vegan. Vegetarian diets usually allow dairy, yogurt, milk, cheese, butter, eggs, and honey.
- compatible: honey; dairy; milk; yogurt; cheese; butter; cream; whey; casein; lactose; eggs, unless another non-vegetarian ingredient is present.
- not_compatible: meat, poultry, fish/seafood, gelatin, lard, collagen, carmine, animal fat, meat broth/stock, animal-derived rennet, or clearly animal-derived enzymes.
- unclear: cheese or yogurt only when product data explicitly lists rennet/enzymes and the animal/microbial/vegetarian source is unclear; ambiguous additives like mono/diglycerides only when relevant.
- Do not mark honey as not_compatible for VEGETARIAN.
- Do not mark yogurt, milk, dairy, cheese, butter, whey, casein, lactose, or eggs as not_compatible for VEGETARIAN by themselves.
- If VEGETARIAN is selected and the product is honey or plain yogurt with no gelatin/rennet/meat/fish/carmine/lard/collagen, return compatible.`,
  PORK_FREE: `PORK_FREE rules:
- not_compatible: pork, bacon, ham, lard, prosciutto, pancetta, pork-derived gelatin, pork fat, pork broth, or another clearly pork-based ingredient is present.
- unclear: gelatin with unspecified source; animal fat or shortening with unspecified source; meat stock or broth with unspecified source; sausage, salami, or pepperoni with unclear meat source; animal-derived enzymes/flavorings with unclear source.
- compatible: simple plant product, plain oil, fruit/vegetable/grain/legume/nut/seed with no suspicious additives; plain fish or fish in simple oil/brine/tomato/water.
- Do not require certification for PORK_FREE.
- Do not create caution for plain sardines, sardines in oil, plain olive oil, fruits, vegetables, grains, legumes, nuts, or seeds unless there is a concrete pork-source trigger.`,
  GLUTEN_FREE:
    'GLUTEN_FREE: not_compatible when gluten, wheat, barley, rye, spelt, or a clearly gluten-containing ingredient is present.',
  DAIRY_FREE:
    'DAIRY_FREE: not_compatible when milk, dairy, lactose, casein, whey, cream, butter, cheese, yogurt, or another dairy ingredient is present.',
  NUT_FREE:
    'NUT_FREE: not_compatible when peanut, almond, walnut, cashew, hazelnut, pistachio, pecan, tree nuts, or a clear nut ingredient is present.',
  PALEO: `PALEO rules:
- not_compatible: clearly non-paleo ingredients such as grains, legumes, dairy, refined sugar-heavy products, or highly processed additives when relevant.
- unclear: processed additives may make compatibility unclear only when actually present and relevant.
- Do not mark simple whole foods as unclear without a concrete reason.`,
};

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
  customAllergy: z
    .string()
    .nullable()
    .optional()
    .describe('Required when allergy is OTHER. Exact matched custom allergy, e.g. almond.'),
  detected: z.boolean(),
  source: z.enum(['off_allergen_tag', 'ingredient_text', 'ai_inference']),
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

const traceDetectionSchema = z.object({
  trace: z
    .string()
    .describe('Concise English trace/cross-contamination warning from product traces, e.g. milk.'),
  allergy: z
    .enum(VALID_ALLERGIES_LIST)
    .nullable()
    .optional()
    .catch(null)
    .describe('Selected profile allergy affected by this trace, or null.'),
  customAllergy: z
    .string()
    .nullable()
    .optional()
    .describe('Required when allergy is OTHER. Exact matched custom allergy, e.g. almond.'),
  restriction: z
    .enum(VALID_RESTRICTIONS_LIST)
    .nullable()
    .optional()
    .catch(null)
    .describe('Selected profile restriction affected by this trace, e.g. DAIRY_FREE, or null.'),
  source: z.enum(['off_trace_tag', 'ingredient_text', 'ai_inference']),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).default([]).describe('Short evidence grounded in product traces.'),
});

const profileIngredientSchema = z.object({
  name: z.string().min(1),
  compatible: z.boolean(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).default([]),
});

const canIHaveThisStatusSchema = z.enum(['yes', 'warning', 'no']);

const profileInfoSchema = z.object({
  profileType: z.enum(['user', 'family_member']),
  profileId: z.string(),
  displayName: z.string().nullable().optional(),
  allergenDetections: z.array(allergenDetectionSchema).default([]),
  restrictionDetections: z.array(restrictionDetectionSchema).default([]),
  traceDetections: z
    .array(traceDetectionSchema)
    .default([])
    .describe('Required for every relevant product trace/may-contain warning for this profile.'),
  ingredients: z.array(profileIngredientSchema).default([]),
  overallSummary: z.string().nullable().optional(),
  canIHaveThis: z.object({
    can: z.boolean(),
    status: canIHaveThisStatusSchema,
    reason: z
      .string()
      .min(1)
      .describe(
        'Natural user-facing eating guidance. Must start with Yes –, Warning –, or No –. For yes/warning, focus on how much or how often to eat it. For no, say avoid it and explain why in human text. Do not use enum values.',
      ),
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
  customAllergy?: string | null;
  detected: boolean;
  source: 'off_allergen_tag' | 'ingredient_text' | 'ai_inference';
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
type AiTraceDetectionOutput = {
  trace: string;
  allergy?: string | null;
  customAllergy?: string | null;
  restriction?: string | null;
  source: 'off_trace_tag' | 'ingredient_text' | 'ai_inference';
  confidence: number;
  evidence: string[];
};
type AiProfileInfoWithIngredients = {
  profileType: 'user' | 'family_member';
  profileId: string;
  displayName?: string | null;
  allergenDetections: AiAllergenDetectionOutput[];
  restrictionDetections: AiRestrictionDetectionOutput[];
  traceDetections: AiTraceDetectionOutput[];
  ingredients: IngredientCompatibilityItem[];
  overallSummary?: string | null;
  canIHaveThis: {
    can: boolean;
    status: AiCanIHaveThisStatus;
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
  traceDetections: AnalyzeBarcodeV2ProfileResult['ai']['traceDetections'];
  ingredients: IngredientCompatibilityItem[];
  canIHaveThis: AnalyzeBarcodeV2ProfileResult['ai']['canIHaveThis'];
};

type CanIHaveThisStatusInput = Pick<
  AnalyzeBarcodeV2ProfileResult['ai'],
  'allergenDetections' | 'restrictionDetections' | 'traceDetections' | 'canIHaveThis'
>;

const CAN_I_HAVE_THIS_STATUS_SET = new Set<AiCanIHaveThisStatus>(['yes', 'warning', 'no']);

function isCanIHaveThisStatus(value: unknown): value is AiCanIHaveThisStatus {
  return typeof value === 'string' && CAN_I_HAVE_THIS_STATUS_SET.has(value as AiCanIHaveThisStatus);
}

function resolveFallbackCanIHaveThisStatus(input: CanIHaveThisStatusInput): AiCanIHaveThisStatus {
  const hasDirectAllergen = input.allergenDetections.some((detection) => detection.detected);
  const hasHardRestriction = input.restrictionDetections.some(
    (detection) => detection.status === 'not_compatible',
  );

  if (hasDirectAllergen || hasHardRestriction) {
    return 'no';
  }

  const hasRestrictionConcern = input.restrictionDetections.some(
    (detection) => detection.status !== 'compatible',
  );
  const hasAllergyTrace = input.traceDetections.some((detection) => Boolean(detection.allergy));

  if (!hasRestrictionConcern && hasAllergyTrace) {
    return 'warning';
  }

  return input.canIHaveThis.can ? 'yes' : 'no';
}

function buildCanIHaveThisAnswer(
  input: CanIHaveThisStatusInput,
): AnalyzeBarcodeV2ProfileResult['ai']['canIHaveThis'] {
  const status = isCanIHaveThisStatus(input.canIHaveThis.status)
    ? input.canIHaveThis.status
    : resolveFallbackCanIHaveThisStatus(input);

  return {
    can: status !== 'no',
    status,
    reason: input.canIHaveThis.reason,
  };
}

function withResolvedCanIHaveThisStatuses(
  response: AnalyzeBarcodeV2Response,
): AnalyzeBarcodeV2Response {
  return {
    ...response,
    profiles: response.profiles.map((profile) => ({
      ...profile,
      ai: {
        ...profile.ai,
        canIHaveThis: buildCanIHaveThisAnswer(profile.ai),
      },
    })),
  };
}

function buildAiAnalysisPrompt(
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
  profiles: ProfileInputForScoring[],
): string {
  const ingredientsDisplay = product.ingredients.join(', ') || 'Not listed';
  const ingredientsLine = `Ingredients as provided (may be non-English; use this list as source of truth, understand/translate internally, and return concise English ingredient names in output): ${ingredientsDisplay}`;

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
  if (n.caloriesPerServing !== null)
    productLines.push(`Calories per serving: ${n.caloriesPerServing} kcal`);
  if (n.proteinPer100g !== null) productLines.push(`Protein per 100g: ${n.proteinPer100g}g`);
  if (n.fatPer100g !== null) productLines.push(`Fat per 100g: ${n.fatPer100g}g`);
  if (n.carbsPer100g !== null) productLines.push(`Carbohydrates per 100g: ${n.carbsPer100g}g`);
  if (n.sugarPer100g !== null) productLines.push(`Sugar per 100g: ${n.sugarPer100g}g`);
  if (n.saturatedFatPer100g !== null)
    productLines.push(`Saturated fat per 100g: ${n.saturatedFatPer100g}g`);
  if (n.sodiumPer100g !== null) productLines.push(`Sodium per 100g: ${n.sodiumPer100g}g`);

  const profileLines: string[] = profiles.map((p, i) => {
    const selectedConcerns = [...p.allergies, ...p.restrictions].join(', ') || 'none';
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
    lines.push(
      `  traceAuditRequired: Compare EVERY product trace (${product.traces.join(', ') || 'none'}) semantically against this profile's selected concerns (${selectedConcerns}). If any trace is relevant, return it in traceDetections for this profile before mentioning it in canIHaveThis.reason or overallSummary.`,
    );
    return lines.join('\n');
  });

  return `PRODUCT DATA:\n${productLines.join('\n')}\n\nPROFILES:\n${profileLines.join('\n\n')}`;
}

function buildSelectedRestrictionPromptRules(profiles: ProfileInputForScoring[]): string {
  const selectedRestrictions = new Set(profiles.flatMap((profile) => profile.restrictions));
  const hasFreeFromRestriction = [...FREE_FROM_RESTRICTIONS].some((restriction) =>
    selectedRestrictions.has(restriction),
  );
  const rules = VALID_RESTRICTIONS_LIST.map((restriction) =>
    selectedRestrictions.has(restriction) ? RESTRICTION_PROMPT_RULES[restriction] : null,
  ).filter((rule): rule is string => Boolean(rule));

  if (hasFreeFromRestriction) {
    rules.unshift(SHARED_FREE_FROM_RESTRICTION_RULES);
  }

  if (rules.length === 0) {
    return 'No profile restrictions are selected. Return restrictionDetections: [] for every profile.';
  }

  return rules.join('\n\n');
}

function buildSystemPrompt(profiles: ProfileInputForScoring[]): string {
  const selectedRestrictionRules = buildSelectedRestrictionPromptRules(profiles);

  return `You are a food product analyzer. Return strictly valid JSON matching the provided schema.
No markdown. No text outside JSON. Do not calculate final scores or weights.

Scope:
- Analyze each profile independently.
- Only use allergies/restrictions listed for that profile.
- If profile allergies/restrictions are empty, return empty detection arrays for them.
- Do not output detected:false or out-of-scope detections.

Product role:
- Choose the closest allowed product.role from the schema enum.
- Use short evidence.

Ingredients:
- Ingredients may be non-English; understand them internally.
- Return ingredients[].name and detection ingredient names in concise English only; do not append original names in parentheses.
- Return one ingredients[] item per listed ingredient when available.
- Mark ingredient compatible=false only for direct selected allergy/restriction conflicts or concrete ingredient-based caution.
- Do not mark ingredients incompatible because of traces.

Custom allergy OTHER:
- Only analyze otherAllergiesText when OTHER is selected.
- Match narrowly: exact custom food, simple singular/plural, or explicit alias in product data.
- Do not generalize almond to nuts, shrimp to fish, sesame to seeds, or oat to wheat.
- Direct custom matches go in allergenDetections with allergy OTHER and exact customAllergy.
- Custom trace-only matches go in traceDetections, not allergenDetections.
- Omit OTHER when not affirmatively present; never use negative evidence as detected:true.

Traces:
- All may-contain/shared-facility/cross-contamination warnings go only in traceDetections.
- Do not put traces in allergenDetections or restrictionDetections.
- If canIHaveThis.reason or overallSummary mentions a trace, traceDetections must include it.
- If traceDetections is empty, do not mention traces.

Restrictions:
- Be practical; avoid theoretical warnings.
- Use unclear/requires_certification only for concrete product-data triggers.
- If ingredients are compatible but traces create risk, keep restrictionDetections ingredient-only and put risk in traceDetections.

Selected restriction rules:
${selectedRestrictionRules}

canIHaveThis:
- status/can: yes=true, warning=true, no=false.
- no: direct selected allergy or not_compatible selected restriction.
- warning: relevant trace, semi_compatible, unclear, or requires_certification without direct no.
- yes: compatible selected concerns and no relevant traces.
- reason: English, one short human sentence, starts with "Yes –", "Warning –", or "No –".
- For yes/warning focus on how much/how often: everyday, regularly, small amounts, occasionally, modest portions.
- For no say avoid and name the plain-language reason.
- No enum values, scores, confidence, or technical words like profile/restriction/compatible.

overallSummary: English, exactly 3 short user-facing sentences, no enum values/scores/confidence.
Evidence arrays: short, grounded, English; may mention original ingredient plus English meaning.`;
}

async function analyzeWithAI(
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
  profiles: ProfileInputForScoring[],
): Promise<AiAnalyzeV2Output | null> {
  try {
    const model = new ChatOpenAI({ modelName: AI_MODEL });
    const structured = model.withStructuredOutput(aiAnalyzeV2OutputSchema);
    const userPrompt = buildAiAnalysisPrompt(product, profiles);

    const result = await structured.invoke([
      { role: 'system', content: buildSystemPrompt(profiles) },
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

const TRAILING_TRANSLATION_ALIAS_PATTERN =
  /\s*\((?!\s*(?:e\d{3,4}[a-z]?|\d+(?:[.,]\d+)?\s*%)\s*\))[^)]{1,80}\)\s*$/iu;

const normalizeAiEnglishIngredientName = (value: string): string => {
  let normalized = value.trim().replace(/\s+/g, ' ');

  while (TRAILING_TRANSLATION_ALIAS_PATTERN.test(normalized)) {
    normalized = normalized.replace(TRAILING_TRANSLATION_ALIAS_PATTERN, '').trim();
  }

  return normalized;
};

const normalizeAiEnglishIngredientNames = (values: string[]): string[] =>
  uniqueNormalizedValues(
    values
      .map((value) => normalizeAiEnglishIngredientName(value))
      .filter((value) => value.length > 0),
  );

const buildTraceGroundingValues = (
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
): string[] => uniqueNormalizedValues(product.traces);

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

const normalizeCustomAllergyValue = (value: string | null | undefined): string | null => {
  const normalized = value?.trim().replace(/\s+/g, ' ') ?? '';
  return normalized.length > 0 ? normalized : null;
};

const buildAllergyDedupeKey = (
  allergy: string | null | undefined,
  customAllergy?: string | null,
): string | null => {
  if (!allergy) return null;

  if (allergy === 'OTHER') {
    const customKey = normalizeCustomAllergyValue(customAllergy)?.toLowerCase();
    return customKey ? `OTHER:${customKey}` : null;
  }

  return allergy;
};

const removeDuplicateTraceAllergy = (
  detection: AiTraceDetectionOutput,
  directAllergyKeys: Set<string>,
): AiTraceDetectionOutput | null => {
  const allergyKey = buildAllergyDedupeKey(detection.allergy, detection.customAllergy);

  if (!allergyKey || !directAllergyKeys.has(allergyKey)) {
    return detection;
  }

  if (detection.restriction) {
    return {
      ...detection,
      allergy: null,
      customAllergy: null,
    };
  }

  return null;
};

const normalizeTraceDetection = (
  detection: AiTraceDetectionOutput,
  groundingValues: string[],
): AiTraceDetectionOutput | null => {
  const evidence = Array.isArray(detection.evidence) ? detection.evidence : [];
  const evidenceText = evidence.join(' ');
  const trace = detection.trace.trim();

  if (!trace || NEGATIVE_EVIDENCE_PATTERN.test(evidenceText)) {
    return null;
  }

  const hasGroundedEvidence =
    groundingValues.length > 0 &&
    (textContainsGroundedValue(trace, groundingValues) ||
      evidence.some((item) => textContainsGroundedValue(item, groundingValues)));

  if (!hasGroundedEvidence) {
    return null;
  }

  const allergy =
    detection.allergy && VALID_ALLERGY_SET.has(detection.allergy) ? detection.allergy : null;
  const restriction =
    detection.restriction && VALID_RESTRICTION_SET.has(detection.restriction)
      ? detection.restriction
      : null;

  return {
    trace,
    allergy,
    customAllergy:
      allergy === 'OTHER' ? normalizeCustomAllergyValue(detection.customAllergy) : null,
    restriction,
    source: detection.source,
    confidence: detection.confidence,
    evidence,
  };
};

function validateAndNormalizeAiResult(
  raw: AiAnalyzeV2Output | null,
  profiles: ProfileInputForScoring[],
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
): ValidatedAiAnalyzeV2Result {
  const traceGroundingValues = buildTraceGroundingValues(product);

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
    return fallbackResult;
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
        ? {
            can: aiProfile.canIHaveThis.can,
            status: aiProfile.canIHaveThis.status,
            reason: aiProfile.canIHaveThis.reason.trim(),
          }
        : {
            can: false,
            status: 'no' as const,
            reason: 'I cannot confirm this product is suitable for you.',
          };

    const overallSummary =
      typeof aiProfile.overallSummary === 'string' && aiProfile.overallSummary.trim().length > 0
        ? normalizeOverallSummaryText(aiProfile.overallSummary)
        : null;

    const rawDetectedAllergenDetections = (aiProfile.allergenDetections ?? []).filter(
      (d) => d.detected,
    );

    const allergenDetections = rawDetectedAllergenDetections
      .filter((d) => VALID_ALLERGY_SET.has(d.allergy) && d.confidence >= 0 && d.confidence <= 1)
      .map((d) => ({
        ...d,
        customAllergy: d.allergy === 'OTHER' ? normalizeCustomAllergyValue(d.customAllergy) : null,
        ingredients: Array.isArray(d.ingredients)
          ? normalizeAiEnglishIngredientNames(d.ingredients)
          : [],
        evidence: Array.isArray(d.evidence) ? d.evidence : [],
      }));

    const directAllergyKeys = new Set(
      allergenDetections
        .map((d) => buildAllergyDedupeKey(d.allergy, d.customAllergy))
        .filter((key): key is string => key !== null),
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
        ingredients: Array.isArray(d.ingredients)
          ? normalizeAiEnglishIngredientNames(d.ingredients)
          : [],
        evidence: Array.isArray(d.evidence) ? d.evidence : [],
      }));

    const rawValidTraceDetections = (aiProfile.traceDetections ?? []).filter(
      (d) => d.trace.trim().length > 0 && d.confidence >= 0 && d.confidence <= 1,
    );

    const traceDetections = rawValidTraceDetections
      .map((d) =>
        normalizeTraceDetection(
          {
            ...d,
            allergy: d.allergy ?? null,
            customAllergy: d.customAllergy ?? null,
            restriction: d.restriction ?? null,
            evidence: Array.isArray(d.evidence) ? d.evidence : [],
          },
          traceGroundingValues,
        ),
      )
      .filter((d): d is AiTraceDetectionOutput => d !== null)
      .map((d) => removeDuplicateTraceAllergy(d, directAllergyKeys))
      .filter((d): d is AiTraceDetectionOutput => d !== null)
      .filter((d) => d.allergy || d.restriction);

    const ingredients = (aiProfile.ingredients ?? [])
      .filter(
        (ingredient) =>
          ingredient.name.trim().length > 0 &&
          ingredient.confidence >= 0 &&
          ingredient.confidence <= 1,
      )
      .map((ingredient) => ({
        name: normalizeAiEnglishIngredientName(ingredient.name),
        compatible: ingredient.compatible,
        confidence: ingredient.confidence,
        evidence: Array.isArray(ingredient.evidence) ? ingredient.evidence : [],
      }))
      .filter((ingredient) => ingredient.name.length > 0);

    // Scope filter: keep only detections for allergies/restrictions the profile actually has
    const allowedAllergies = new Set(profile.allergies);
    const scopedAllergenDetections = allergenDetections.filter((d) =>
      allowedAllergies.has(d.allergy),
    );

    const allowedRestrictions = new Set(profile.restrictions);
    const scopedRestrictionDetections = restrictionDetections.filter((d) =>
      allowedRestrictions.has(d.restriction),
    );

    const scopedTraceDetections = traceDetections.filter((d) => {
      const allergyInScope = d.allergy ? allowedAllergies.has(d.allergy) : false;
      const restrictionInScope = d.restriction ? allowedRestrictions.has(d.restriction) : false;
      return allergyInScope || restrictionInScope;
    });

    // Log warning if AI returned out-of-scope detections
    const invalidAllergenDetectionCount =
      rawDetectedAllergenDetections.length - allergenDetections.length;
    const droppedAllergens = allergenDetections.filter((d) => !allowedAllergies.has(d.allergy));
    const droppedRestrictions = restrictionDetections.filter(
      (d) => !allowedRestrictions.has(d.restriction),
    );
    const droppedTraceDetections = traceDetections.filter((d) => {
      const allergyInScope = d.allergy ? allowedAllergies.has(d.allergy) : false;
      const restrictionInScope = d.restriction ? allowedRestrictions.has(d.restriction) : false;
      return !allergyInScope && !restrictionInScope;
    });
    if (
      invalidAllergenDetectionCount > 0 ||
      droppedAllergens.length > 0 ||
      droppedRestrictions.length > 0 ||
      droppedTraceDetections.length > 0
    ) {
      console.warn(`[ProductAnalyzeV2] Invalid or out-of-scope AI detections dropped`, {
        profileId: profile.profileId,
        invalidAllergenDetectionCount,
        droppedAllergenDetections: droppedAllergens.map((d) => d.allergy),
        droppedRestrictionDetections: droppedRestrictions.map((d) => d.restriction),
        droppedTraceDetections: droppedTraceDetections.map((d) => ({
          trace: d.trace,
          allergy: d.allergy,
          restriction: d.restriction,
        })),
      });
    }

    return {
      profileType: aiProfile.profileType,
      profileId: aiProfile.profileId,
      displayName: aiProfile.displayName ?? profile.displayName,
      allergenDetections: scopedAllergenDetections,
      restrictionDetections: scopedRestrictionDetections,
      traceDetections: scopedTraceDetections,
      ingredients,
      overallSummary,
      canIHaveThis,
      uncertaintyFlags: Array.isArray(aiProfile.uncertaintyFlags) ? aiProfile.uncertaintyFlags : [],
    };
  });

  return {
    product: {
      role: raw.product.role as ProductRole,
      confidence: raw.product.confidence,
      evidence: raw.product.evidence,
    },
    profileInfo: validatedProfileInfo,
  };
}

function buildFallbackProfileInfo(profile: ProfileInputForScoring): AiProfileInfoWithIngredients {
  return {
    profileType: profile.profileType,
    profileId: profile.profileId,
    displayName: profile.displayName,
    allergenDetections: [],
    restrictionDetections: [],
    traceDetections: [],
    ingredients: [],
    overallSummary: null,
    canIHaveThis: {
      can: false,
      status: 'no',
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

function resolveProductRole(aiProduct: AiProductAnalyzeV2Result['product']): RoleResult {
  if (PRODUCT_ROLE_SET.has(aiProduct.role) && aiProduct.confidence >= MIN_AI_CONFIDENCE) {
    return {
      value: aiProduct.role,
      source: 'ai',
      confidence: aiProduct.confidence,
      validated: true,
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
    status: 'no',
    reason: 'I cannot confirm this product is suitable for you.',
  };

  const profileAi = {
    allergenDetections: aiProfileInfo?.allergenDetections ?? [],
    restrictionDetections: aiProfileInfo?.restrictionDetections ?? [],
    traceDetections: aiProfileInfo?.traceDetections ?? [],
    ingredients: aiProfileInfo?.ingredients ?? [],
    canIHaveThis,
  };

  return {
    ...profileAi,
    canIHaveThis: buildCanIHaveThisAnswer(profileAi),
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

  // 5. Classify product role and detect profile allergens/restrictions via AI (once per product+profiles)
  console.log(
    `[ProductAnalyzeV2] Running AI analysis — ${logContext} profiles=${allProfiles.length}`,
  );
  const rawAiOutput = await analyzeWithAI(product, allProfiles);
  const aiResult = validateAndNormalizeAiResult(rawAiOutput, allProfiles, product);

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

function hasEnoughCachedProductInformation(
  response: AnalyzeBarcodeV2Response,
  barcode: string,
): boolean {
  return hasEnoughProductInformation({
    barcode,
    name: response.product.name,
    brand: response.product.brand,
    imageUrl: response.product.imageUrl,
    ingredients: response.product.ingredients,
    allergens: response.product.allergens,
    traces: response.product.traces,
    additives: response.product.additives,
    categories: [],
    servingSizeText: null,
    servingSizeGrams: null,
    servingSizeMl: null,
    nutrition: {
      ...response.product.nutrition,
      saltPer100g: null,
    },
  });
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
      isAnalyzeBarcodeV2Response(scan.multiProfileResult) &&
      hasEnoughCachedProductInformation(scan.multiProfileResult, input.barcode),
  );

  if (!reusableScan || !isAnalyzeBarcodeV2Response(reusableScan.multiProfileResult)) {
    return null;
  }

  return {
    barcode: input.barcode,
    result: withResolvedCanIHaveThisStatuses(reusableScan.multiProfileResult),
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
    console.log(JSON.stringify(err, null, 2));

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

  if (!hasEnoughProductInformation(product)) {
    console.warn(`[ProductAnalyzeV2] Product data insufficient — barcode=${barcode}`);
    throw ApiError.unprocessable(
      'Not enough information about product',
      'INSUFFICIENT_PRODUCT_DATA',
    );
  }

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
