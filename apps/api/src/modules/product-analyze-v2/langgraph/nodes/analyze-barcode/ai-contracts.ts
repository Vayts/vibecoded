import { z } from 'zod';
import { VALID_PRODUCT_ROLES } from '../../../constants/product-roles.constants.js';
import type {
  AiCanIHaveThisStatus,
  AiProductAnalyzeV2Result,
} from '../../../types/ai-analyze.types.js';
import { TRACE_SENSITIVE_RESTRICTIONS } from '../../../utils/trace-sensitive-restrictions.util.js';

export const AI_MODEL = 'gpt-5.4-mini';

export const VALID_ALLERGIES_LIST = [
  'PEANUTS',
  'TREE_NUTS',
  'SOY',
  'EGGS',
  'SHELLFISH',
  'SESAME',
  'OTHER',
] as const;

export const VALID_RESTRICTIONS_LIST = [
  'VEGAN',
  'VEGETARIAN',
  'KETO',
  'PALEO',
  'GLUTEN_FREE',
  'DAIRY_FREE',
  'PORK_FREE',
  'NUT_FREE',
] as const;

export type ValidRestriction = (typeof VALID_RESTRICTIONS_LIST)[number];

export const VALID_ALLERGY_SET = new Set(VALID_ALLERGIES_LIST as readonly string[]);
export const VALID_RESTRICTION_SET = new Set(VALID_RESTRICTIONS_LIST as readonly string[]);
export const VALID_RESTRICTION_STATUS_SET = new Set([
  'compatible',
  'semi_compatible',
  'not_compatible',
  'unclear',
  'requires_certification',
]);

export const SHARED_FREE_FROM_RESTRICTION_RULES = `GLUTEN_FREE/DAIRY_FREE/NUT_FREE shared rules:
- not_compatible: relevant ingredient is clearly present.
- semi_compatible: only for ingredient-based partial compatibility, not traces.
- unclear/caution: ingredient is ambiguous and commonly contains the restricted item, or product data is incomplete in a way that prevents a better determination.
- Do not infer cross-contamination if product data does not mention it.
- Use traceDetections, not restrictionDetections, for explicit trace/cross-contamination warnings.`;

export const TRACE_SEMANTIC_PROMPT_RULES = `Trace semantic matching rules:
- Compare each trace against selected allergies and selected trace-sensitive restrictions separately.
- Fill traceDetections.allergy only when the trace itself semantically matches that selected allergy.
- Fill traceDetections.restriction only when the trace itself semantically matches that selected trace-sensitive restriction.
- A trace may set allergy only, restriction only, both, or neither. Use null for any field without a direct semantic match.
- Do not copy a selected restriction into traceDetections.restriction unless the trace belongs to that restriction family.
- If the only selected trace-sensitive restriction is unrelated to the trace, keep traceDetections.restriction null instead of forcing a match.
- Dairy traces such as milk, butter, cream, cheese, yogurt, whey, casein, or lactose belong only to DAIRY_FREE concerns, not allergy outputs.
- Gluten traces such as wheat, barley, rye, malt, or spelt belong only to GLUTEN_FREE concerns, not allergy outputs.
- Nut traces such as peanut, almond, hazelnut, walnut, cashew, pistachio, pecan, Brazil nut, macadamia, or tree nuts belong only to PEANUTS/TREE_NUTS or NUT_FREE concerns.
- Egg traces belong only to EGGS. Soy traces belong only to SOY. Sesame traces belong only to SESAME. Shellfish/crustacean traces belong only to SHELLFISH.
- For allergy OTHER, only exact custom trace matches belong to OTHER.
- Never cross-assign unrelated concerns.
- Examples: milk trace may match DAIRY_FREE only, never NUT_FREE; almond trace may match TREE_NUTS and NUT_FREE, but never DAIRY_FREE; wheat trace may match GLUTEN_FREE only, never NUT_FREE.
- Counterexamples: trace nuts + selected GLUTEN_FREE => restriction null; trace nuts + selected DAIRY_FREE => restriction null; trace wheat + selected NUT_FREE => restriction null; trace milk + selected GLUTEN_FREE => restriction null.`;

export const FREE_FROM_RESTRICTIONS = new Set<ValidRestriction>(TRACE_SENSITIVE_RESTRICTIONS);

export const RESTRICTION_PROMPT_RULES: Partial<Record<ValidRestriction, string>> = {
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

export const allergenDetectionSchema = z.object({
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

export const restrictionDetectionSchema = z.object({
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

export const traceDetectionSchema = z.object({
  trace: z
    .string()
    .describe('Concise English trace/cross-contamination warning from product traces, e.g. milk.'),
  allergy: z
    .enum(VALID_ALLERGIES_LIST)
    .nullable()
    .optional()
    .catch(null)
    .describe(
      'Selected profile allergy directly matched by this trace. Use only when the trace itself semantically belongs to that allergy, e.g. sesame -> SESAME, almond -> TREE_NUTS, egg -> EGGS. Otherwise null.',
    ),
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
    .describe(
      'Selected matching trace-sensitive profile restriction directly matched by this trace. Use only GLUTEN_FREE, DAIRY_FREE, or NUT_FREE when the trace itself belongs to that restriction family, e.g. milk -> DAIRY_FREE, wheat -> GLUTEN_FREE, almond -> NUT_FREE. Do not use unrelated selected restrictions such as milk -> NUT_FREE, nuts -> GLUTEN_FREE, wheat -> NUT_FREE, or milk -> GLUTEN_FREE. If no selected restriction directly matches the trace family, return null.',
    ),
  source: z.enum(['off_trace_tag', 'ingredient_text', 'ai_inference']),
  confidence: z.number().min(0).max(1),
  evidence: z
    .array(z.string())
    .default([])
    .describe(
      'Short evidence grounded in product traces only; do not justify a trace with unrelated selected concerns.',
    ),
});

export const profileIngredientSchema = z.object({
  name: z.string().min(1),
  compatible: z.boolean(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).default([]),
});

export const canIHaveThisStatusSchema = z.enum(['yes', 'warning', 'no']);

export const coreProfileInfoSchema = z.object({
  profileType: z.enum(['user', 'family_member']),
  profileId: z.string(),
  displayName: z.string().nullable().optional(),
  allergenDetections: z.array(allergenDetectionSchema).default([]),
  restrictionDetections: z.array(restrictionDetectionSchema).default([]),
  ingredients: z.array(profileIngredientSchema).default([]),
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

export const coreAnalyzeV2OutputSchema = z.object({
  product: z.object({
    isFoodProduct: z
      .boolean()
      .describe(
        'True only for human food or beverage meant to be eaten or drunk. False for supplements, vitamins, medicine, pet food, cosmetics, household goods, and ambiguous non-food items.',
      ),
    englishName: z
      .string()
      .nullable()
      .describe(
        'Natural English translation of the product name only when the original product name is clearly non-English. Return null when the product name is already English, mostly English, only a brand, or not confidently translatable.',
      ),
    role: z.string().describe('One of the ProductRole values'),
    confidence: z.number().min(0).max(1).describe('Confidence from 0 to 1'),
    evidence: z.array(z.string()).describe('Short evidence strings supporting the role'),
  }),
  profileInfo: z
    .array(coreProfileInfoSchema)
    .describe(
      'Per-profile ingredient and restriction analysis results only. No traces or user-facing advice.',
    ),
});

export const adviceProfileSchema = z.object({
  profileType: z.enum(['user', 'family_member']),
  profileId: z.string(),
  displayName: z.string().nullable().optional(),
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
});

export const adviceOutputSchema = z.object({
  profileInfo: z
    .array(adviceProfileSchema)
    .describe('Per-profile user-facing guidance only. Do not include detections or product role.'),
});

export const traceAuditProfileSchema = z.object({
  profileType: z.enum(['user', 'family_member']),
  profileId: z.string(),
  displayName: z.string().nullable().optional(),
  traceDetections: z
    .array(traceDetectionSchema)
    .default([])
    .describe(
      'Per-profile trace detections only. Return a trace only when it directly matches a selected allergy or selected matching trace-sensitive restriction. Keep unrelated fields null.',
    ),
});

export const traceAuditOutputSchema = z.object({
  profileInfo: z
    .array(traceAuditProfileSchema)
    .describe('Exactly one trace-only result for each provided profile.'),
});

export type IngredientCompatibilityItem = {
  name: string;
  compatible: boolean;
  confidence: number;
  evidence: string[];
};

export type AiAllergenDetectionOutput = {
  allergy: string;
  customAllergy?: string | null;
  detected: boolean;
  source: 'off_allergen_tag' | 'ingredient_text' | 'ai_inference';
  confidence: number;
  ingredients: string[];
  evidence: string[];
};

export type AiRestrictionDetectionOutput = {
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

export type AiTraceDetectionOutput = {
  trace: string;
  allergy?: string | null;
  customAllergy?: string | null;
  restriction?: string | null;
  source: 'off_trace_tag' | 'ingredient_text' | 'ai_inference';
  confidence: number;
  evidence: string[];
};

export type AiProfileInfoWithIngredients = {
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

export type AiAnalyzeV2Output = {
  product: {
    isFoodProduct: boolean;
    englishName: string | null;
    role: string;
    confidence: number;
    evidence: string[];
  };
  profileInfo: AiProfileInfoWithIngredients[];
};

export type AiCoreAnalyzeOutput = z.infer<typeof coreAnalyzeV2OutputSchema>;
export type AiAdviceOutput = z.infer<typeof adviceOutputSchema>;
export type AiTraceAuditOutput = z.infer<typeof traceAuditOutputSchema>;

export type ValidatedAiAnalyzeV2Result = {
  product: AiProductAnalyzeV2Result['product'];
  profileInfo: AiProfileInfoWithIngredients[];
};
