import { ChatOpenAI } from '@langchain/openai';
import type { NormalizedProduct, PersonalAnalysisResult, PersonalFitLabel } from '@acme/shared';
import { z } from 'zod';
import { AI_MODELS } from '../domain/flashcards/prompts';
import type { ProfileInput } from './profileInputs';
import {
  buildPrompt,
  getProfileLabel,
  multiProfilePersonalAnalysisOutputSchema,
  personalProfileResultSchema,
  PERSONAL_ANALYSIS_SYSTEM_PROMPT,
} from '../domain/personal-analysis/personal-analysis-prompt';
import { filterPersonalAnalysisNegativesWithAllergies } from '../domain/personal-analysis/restriction-filter';


// Fallback labels for restriction items when AI returns empty fields
const RESTRICTION_FALLBACKS: Record<string, { label: string; description: string }> = {
  'restriction-kosher': { label: 'Kosher', description: 'May conflict with kosher diet' },
  'restriction-halal': { label: 'Halal', description: 'May conflict with halal diet' },
  'restriction-vegan': { label: 'Vegan', description: 'Contains animal-derived ingredients' },
  'restriction-vegetarian': { label: 'Vegetarian', description: 'Contains meat or fish ingredients' },
  'restriction-gluten_free': { label: 'Gluten-free', description: 'Contains gluten sources' },
  'restriction-dairy_free': { label: 'Dairy-free', description: 'Contains dairy ingredients' },
  'restriction-nut_free': { label: 'Nut-free', description: 'Contains nuts' },
};

const toPersonalAnalysisResult = (
  profileResult: z.infer<typeof personalProfileResultSchema>,
  userAllergies: string[],
): PersonalAnalysisResult => {
  const positives = profileResult.positives.map((p) => {
    const isNutrition = p.category === 'nutrition';
    return {
      key: p.key,
      label: p.label,
      description: p.description,
      value: isNutrition ? p.value : null,
      unit: isNutrition ? p.unit : null,
      per: isNutrition ? p.per : null,
      severity: p.severity === 'good' || p.severity === 'neutral' ? p.severity : ('good' as const),
      category: p.category,
      overview: p.description,
    };
  });

  const negatives = profileResult.negatives.map((n) => {
    const fallback = RESTRICTION_FALLBACKS[n.key];
    const label = n.label || fallback?.label || n.key;
    const description = n.description || fallback?.description || '';
    // Non-nutrition items should never have numeric values displayed
    const isNutrition = n.category === 'nutrition';
    return {
      key: n.key,
      label,
      description,
      value: isNutrition ? n.value : null,
      unit: isNutrition ? n.unit : null,
      per: isNutrition ? n.per : null,
      severity: n.severity === 'warning' || n.severity === 'bad' ? n.severity : ('warning' as const),
      category: n.category,
      overview: description,
    };
  });

  // Guard: remove restriction "compatible" positives — we only show restrictions when there's a problem.
  // Also dedup: if same key appears in both positives and negatives, keep only the negative.
  const filteredNegatives = filterPersonalAnalysisNegativesWithAllergies(negatives, userAllergies);
  const negativeKeys = new Set(filteredNegatives.map((n) => n.key));
  const dedupedPositives = positives.filter(
    (p) => p.category !== 'restriction' && !negativeKeys.has(p.key),
  );

  // Guard: if fitScore is 0 but there are no "bad" severity restriction items,
  // the AI incorrectly zeroed the score for a warning-only restriction.
  // Restore score to at least 40 (neutral) so warnings don't tank the score.
  let fitScore = profileResult.fitScore;
  const hasBadRestriction = filteredNegatives.some(
    (n) => n.category === 'restriction' && n.severity === 'bad',
  );
  const hasBadAllergen = filteredNegatives.some(
    (n) => n.key.startsWith('allergy') && n.severity === 'bad',
  );
  if (fitScore === 0 && !hasBadRestriction && !hasBadAllergen) {
    fitScore = Math.max(fitScore, 40);
  }

  const fitLabel = (
    fitScore >= 80
      ? 'great_fit'
      : fitScore >= 60
        ? 'good_fit'
        : fitScore >= 40
          ? 'neutral'
          : 'poor_fit'
  ) as PersonalFitLabel;

  return {
    fitScore,
    fitLabel,
    summary: profileResult.summary,
    positives: dedupedPositives,
    negatives: filteredNegatives,
    ingredientAnalysis: null,
  };
};

let cachedModel: ChatOpenAI | undefined;

const getModel = (): ChatOpenAI => {
  if (!cachedModel) {
    cachedModel = new ChatOpenAI({
      model: AI_MODELS.reason,
      temperature: 0.1,
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 3,
    });
  }
  return cachedModel;
};

/**
 * Run AI-based personal product analysis for all profiles in a single request.
 * Returns a map of profileId → PersonalAnalysisResult.
 */
export const analyzeProductForProfiles = async (
  product: NormalizedProduct,
  profiles: ProfileInput[],
): Promise<Map<string, PersonalAnalysisResult>> => {
  const resultMap = new Map<string, PersonalAnalysisResult>();

  if (!process.env.OPENAI_API_KEY || profiles.length === 0) {
    return resultMap;
  }

  try {
    const userMessage = buildPrompt(product, profiles);
    const profileLabels = profiles.map((p, i) => `${getProfileLabel(i)}="${p.profileName}"`).join(', ');
    console.log(`[PersonalAnalysis] ⏳ Invoking AI  product="${product.product_name ?? product.code}"  profiles=[${profileLabels}]`);
    const t0 = Date.now();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const structuredModel = (getModel() as any).withStructuredOutput(
      multiProfilePersonalAnalysisOutputSchema,
    );

    const result = await structuredModel.invoke([
      { role: 'system', content: PERSONAL_ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ]);

    const parsed = multiProfilePersonalAnalysisOutputSchema.parse(result);
    console.log(`[PersonalAnalysis] ✅ AI responded  ${Date.now() - t0}ms  got ${parsed.profiles.length} profile(s)`);

    for (let i = 0; i < profiles.length; i++) {
      const label = getProfileLabel(i);
      const profileOutput = parsed.profiles.find((p) => p.profileLabel === label);
      if (profileOutput) {
        resultMap.set(profiles[i].profileId, toPersonalAnalysisResult(profileOutput, profiles[i].onboarding.allergies));
      }
    }

    return resultMap;
  } catch (error) {
    console.error(
      '[PersonalAnalysisAI] Failed:',
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
};
