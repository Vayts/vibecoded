import type { ProfileInputForScoring } from '../../../types/scoring.types.js';
import { normalizeOpenFoodFactsProduct } from '../../../utils/normalize-open-food-facts-product.util.js';
import {
  TRACE_SENSITIVE_RESTRICTIONS,
  isTraceSensitiveRestriction,
} from '../../../utils/trace-sensitive-restrictions.util.js';
import {
  FREE_FROM_RESTRICTIONS,
  RESTRICTION_PROMPT_RULES,
  SHARED_FREE_FROM_RESTRICTION_RULES,
  TRACE_SEMANTIC_PROMPT_RULES,
  VALID_RESTRICTIONS_LIST,
} from './ai-contracts.js';
import type { ValidatedAiAnalyzeV2Result } from './ai-contracts.js';
import { buildFallbackProfileInfo } from './ai-normalization.js';

export function buildCoreAnalysisPrompt(
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
  profiles: ProfileInputForScoring[],
): string {
  const ingredientsDisplay = product.ingredients.join(', ') || 'Not listed';
  const ingredientsLine = `Ingredients: ${ingredientsDisplay}`;

  const productLines: string[] = [
    `Product name: ${product.name ?? 'Unknown'}`,
    `Brand: ${product.brand ?? 'Unknown'}`,
    `Categories: ${product.categories.join(', ') || 'None'}`,
    ingredientsLine,
    `Allergens (from product data): ${product.allergens.join(', ') || 'None'}`,
  ];

  const profileLines: string[] = profiles.map((profile, index) => {
    const lines = [
      `Profile ${index + 1}:`,
      `  profileType: ${profile.profileType}`,
      `  profileId: ${profile.profileId}`,
      `  allergies: ${profile.allergies.join(', ') || 'none'}`,
    ];

    if (profile.otherAllergiesText) {
      lines.push(
        `  otherAllergiesText (match narrowly; do not generalize): ${profile.otherAllergiesText}`,
      );
    }

    lines.push(`  restrictions: ${profile.restrictions.join(', ') || 'none'}`);
    return lines.join('\n');
  });

  return `PRODUCT DATA:\n${productLines.join('\n')}\n\nPROFILES:\n${profileLines.join('\n\n')}`;
}

export function buildTraceAuditPrompt(
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
  profiles: ProfileInputForScoring[],
): string {
  const profileLines = profiles.map((profile, index) => {
    const traceSensitiveRestrictions =
      profile.restrictions.filter(isTraceSensitiveRestriction).join(', ') || 'none';
    const lines = [
      `Profile ${index + 1}:`,
      `  profileType: ${profile.profileType}`,
      `  profileId: ${profile.profileId}`,
      `  displayName: ${profile.displayName ?? 'null'}`,
      `  allergies: ${profile.allergies.join(', ') || 'none'}`,
      `  traceSensitiveRestrictions: ${traceSensitiveRestrictions}`,
    ];

    if (profile.otherAllergiesText) {
      lines.push(`  otherAllergiesText: ${profile.otherAllergiesText}`);
    }

    return lines.join('\n');
  });

  return `TRACE DATA:\nProduct traces: ${product.traces.join(', ') || 'none'}\n\nPROFILES:\n${profileLines.join('\n\n')}`;
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

export function buildCoreSystemPrompt(profiles: ProfileInputForScoring[]): string {
  const selectedRestrictionRules = buildSelectedRestrictionPromptRules(profiles);

  return `You are a food product analyzer. Return strictly valid JSON matching the provided schema.
No markdown. No text outside JSON. Do not calculate final scores or weights.

Scope:
- Analyze each profile independently.
- Only use allergies/restrictions listed for that profile.
- If profile allergies/restrictions are empty, return empty detection arrays for them.
- Do not output detected:false or out-of-scope detections.
- This pass is only for product role, ingredient compatibility, allergenDetections, restrictionDetections, ingredients, and uncertaintyFlags.
- Do not return traces or user-facing advice in this pass.

Product role:
- First decide whether this is actually a human food or beverage for this feature.
- Set product.isFoodProduct=true only for products clearly meant to be eaten or drunk by humans.
- Set product.isFoodProduct=false for supplements, vitamins, capsules, tablets, protein powders marketed as supplements, protein bars marketed as supplements, medicine, pet food, cosmetics, household items, and ambiguous non-food products.
- Return product.englishName only when the original product name is clearly non-English and you can translate it confidently into natural concise English.
- If the product name is already English, mostly English, just a brand, or not confidently translatable, return product.englishName=null.
- Translate the product name only, not the brand.
- Choose the closest allowed product.role from the schema enum.
- Use short evidence.

Non-food handling:
- If product.isFoodProduct=false, still return a best-fit product.role and short evidence.
- If product.isFoodProduct=false, keep profile detections conservative and do not invent compatibility findings.

Ingredients:
- Ingredients may be non-English; understand them internally.
- Return ingredients[].name and detection ingredient names in concise English only; do not append original names in parentheses.
- Return one ingredients[] item per listed ingredient when available.
- Mark ingredient compatible=false only for direct selected allergy/restriction conflicts or concrete ingredient-based caution.
- Do not mark ingredients incompatible because of traces.

Traces:
- Ignore product traces, may-contain warnings, and cross-contamination in this pass.
- Do not infer trace risk here. Traces are handled in a separate pass.

Custom allergy OTHER:
- Only analyze otherAllergiesText when OTHER is selected.
- Match narrowly: exact custom food, simple singular/plural, or explicit alias in product data.
- Do not generalize almond to nuts, shrimp to fish, sesame to seeds, or oat to wheat.
- Direct custom matches go in allergenDetections with allergy OTHER and exact customAllergy.
- Omit OTHER when not affirmatively present; never use negative evidence as detected:true.

Restrictions:
- Be practical; avoid theoretical warnings.
- Use unclear/requires_certification only for concrete product-data triggers.
- RestrictionDetections in this pass are ingredient-only. Do not include trace-based warnings.

Selected restriction rules:
${selectedRestrictionRules}

Evidence arrays: short, grounded, English; may mention original ingredient plus English meaning.`;
}

export function buildAdvicePrompt(
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
  profiles: ProfileInputForScoring[],
  aiResult: ValidatedAiAnalyzeV2Result,
): string {
  const productLines = [
    `Product name: ${product.name ?? 'Unknown'}`,
    `Brand: ${product.brand ?? 'Unknown'}`,
    `Categories: ${product.categories.join(', ') || 'None'}`,
    `Resolved product role from previous pass: ${aiResult.product.role}`,
    `Serving size: ${product.servingSizeText ?? 'Unknown'}`,
    `Calories per 100g: ${product.nutrition.caloriesPer100g ?? 'Unknown'}`,
    `Calories per serving: ${product.nutrition.caloriesPerServing ?? 'Unknown'}`,
    `Protein per 100g: ${product.nutrition.proteinPer100g ?? 'Unknown'}`,
    `Sugar per 100g: ${product.nutrition.sugarPer100g ?? 'Unknown'}`,
    `Fiber per 100g: ${product.nutrition.fiberPer100g ?? 'Unknown'}`,
    `Ingredients: ${product.ingredients.join(', ') || 'None'}`,
    `Allergens: ${product.allergens.join(', ') || 'None'}`,
    `Traces: ${product.traces.join(', ') || 'None'}`,
  ];

  const profileLines = profiles.map((profile, index) => {
    const aiProfile =
      aiResult.profileInfo.find(
        (candidate) =>
          candidate.profileId === profile.profileId &&
          candidate.profileType === profile.profileType,
      ) ?? buildFallbackProfileInfo(profile);
    const flaggedIngredients = aiProfile.ingredients
      .filter((ingredient) => !ingredient.compatible)
      .map((ingredient) => ingredient.name);
    const lines = [
      `Profile ${index + 1}:`,
      `  profileType: ${profile.profileType}`,
      `  profileId: ${profile.profileId}`,
      `  displayName: ${profile.displayName ?? 'null'}`,
      `  selectedAllergies: ${profile.allergies.join(', ') || 'none'}`,
      `  selectedRestrictions: ${profile.restrictions.join(', ') || 'none'}`,
      `  allergenDetections: ${JSON.stringify(aiProfile.allergenDetections)}`,
      `  restrictionDetections: ${JSON.stringify(aiProfile.restrictionDetections)}`,
      `  traceDetections: ${JSON.stringify(aiProfile.traceDetections)}`,
      `  flaggedIngredients: ${flaggedIngredients.join(', ') || 'none'}`,
    ];

    if (profile.otherAllergiesText) {
      lines.push(`  otherAllergiesText: ${profile.otherAllergiesText}`);
    }

    return lines.join('\n');
  });

  return `PRODUCT DATA:\n${productLines.join('\n')}\n\nNORMALIZED PROFILE INPUTS:\n${profileLines.join('\n\n')}`;
}

export function buildAdviceSystemPrompt(): string {
  return `You are a food advice composer. Return strictly valid JSON matching the provided schema.
No markdown. No text outside JSON.

Task:
- Return only overallSummary and canIHaveThis for each provided profile.
- Use only the provided normalized detections, flagged ingredients, and product facts.
- Do not invent, remove, or change any allergies, restrictions, traces, ingredients, or evidence.
- Do not add new conflicts that are not present in the provided arrays.
- If traceDetections is empty for a profile, do not mention traces for that profile.
- If allergenDetections shows a direct detected allergy or restrictionDetections shows not_compatible, canIHaveThis should normally be no.
- If there is no direct no but there are relevant traceDetections, semi_compatible, unclear, or requires_certification items, canIHaveThis should normally be warning.
- If there are no relevant direct conflicts and no relevant warnings, canIHaveThis should normally be yes.
- Keep the advice practical, human, and slightly polished like a premium nutrition guide.
- canIHaveThis.reason must be exactly 2 short English sentences.
- Sentence 1 must start with Yes –, Warning –, or No – and give the clear permission verdict.
- Sentence 2 must give grounded eating guidance based on the product role, ingredients, traces, and nutrition facts, such as breakfast, snack, occasional treat, balanced meal, or portion guidance.
- Only mention breakfast, snack, meal, treat, or portion size when the provided product facts support it.
- Keep the copy varied and avoid repetitive templates.
- Do not repeat the same concern in both sentences.
- overallSummary must be exactly 3 short English sentences.
- Do not use enum values, scores, confidence, or technical field names in the user-facing text.`;
}

export function buildTraceAuditSystemPrompt(): string {
  return `You are a food trace auditor. Return strictly valid JSON matching the provided schema.
No markdown. No text outside JSON.

Task:
- Analyze only product traces / may-contain / shared-facility warnings.
- Return only profileInfo with traceDetections. Do not analyze ingredients, restrictions, summaries, or product role.
- For each returned traceDetection, determine allergy and restriction from the trace itself only.
- allergy and restriction are independent fields.
- If a trace matches an allergy but not a selected trace-sensitive restriction, keep restriction null.
- If a trace matches a selected trace-sensitive restriction but not an allergy, keep allergy null.
- If a trace matches neither, do not return it.
- If a profile selected only unrelated trace-sensitive restrictions, keep restriction null instead of forcing the closest selected restriction.
- Use traceDetections.restriction only for ${TRACE_SENSITIVE_RESTRICTIONS.join(', ')}.
- Milk and other dairy traces may match DAIRY_FREE only, never NUT_FREE or allergy outputs.
- Sesame traces may match SESAME only, never NUT_FREE.
- Soy traces may match SOY only, never NUT_FREE.
- Nut traces may match PEANUTS or TREE_NUTS and NUT_FREE, but never DAIRY_FREE.
- Wheat, barley, rye, malt, and spelt traces may match GLUTEN_FREE only, never NUT_FREE or allergy outputs.
- Counterexamples: if trace is nuts and the profile selected only GLUTEN_FREE, return restriction null; if trace is nuts and the profile selected NUT_FREE, return restriction NUT_FREE; if trace is milk and the profile selected only GLUTEN_FREE, return restriction null.
- For allergy OTHER, only exact custom trace matches count.

${TRACE_SEMANTIC_PROMPT_RULES}
- source must be off_trace_tag when the evidence comes from product traces.
- evidence must quote or restate the actual trace warning in short English.
- If product traces are none or no trace is relevant for a profile, return traceDetections: [].`;
}
