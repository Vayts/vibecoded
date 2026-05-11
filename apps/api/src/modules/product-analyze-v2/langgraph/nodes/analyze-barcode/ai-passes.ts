import { ChatOpenAI } from '@langchain/openai';
import type { ProfileInputForScoring } from '../../../types/scoring.types.js';
import { normalizeOpenFoodFactsProduct } from '../../../utils/normalize-open-food-facts-product.util.js';
import { isTraceSensitiveRestriction } from '../../../utils/trace-sensitive-restrictions.util.js';
import {
  AI_MODEL,
  adviceOutputSchema,
  coreAnalyzeV2OutputSchema,
  normalizeOverallSummaryText,
  traceAuditOutputSchema,
} from './ai-contracts.js';
import type {
  AiAdviceOutput,
  AiAnalyzeV2Output,
  AiCoreAnalyzeOutput,
  AiTraceAuditOutput,
  ValidatedAiAnalyzeV2Result,
} from './ai-contracts.js';
import {
  buildAdvicePrompt,
  buildAdviceSystemPrompt,
  buildCoreAnalysisPrompt,
  buildCoreSystemPrompt,
  buildTraceAuditPrompt,
  buildTraceAuditSystemPrompt,
} from './prompts.js';

export async function analyzeCoreWithAI(
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
  profiles: ProfileInputForScoring[],
): Promise<AiCoreAnalyzeOutput | null> {
  try {
    const model = new ChatOpenAI({ modelName: AI_MODEL, temperature: 0 });
    const structured = model.withStructuredOutput(coreAnalyzeV2OutputSchema);
    const userPrompt = buildCoreAnalysisPrompt(product, profiles);

    const result = await structured.invoke([
      { role: 'system', content: buildCoreSystemPrompt(profiles) },
      { role: 'user', content: userPrompt },
    ]);

    return coreAnalyzeV2OutputSchema.parse(result);
  } catch (err) {
    console.error('[ProductAnalyzeV2] AI core analysis failed:', err);
    return null;
  }
}

export async function analyzeTracesWithAI(
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
  profiles: ProfileInputForScoring[],
): Promise<AiTraceAuditOutput | null> {
  if (
    product.traces.length === 0 ||
    !profiles.some(
      (profile) =>
        profile.allergies.length > 0 || profile.restrictions.some(isTraceSensitiveRestriction),
    )
  ) {
    return null;
  }

  try {
    const model = new ChatOpenAI({ modelName: AI_MODEL, temperature: 0 });
    const structured = model.withStructuredOutput(traceAuditOutputSchema);
    const result = await structured.invoke([
      { role: 'system', content: buildTraceAuditSystemPrompt() },
      { role: 'user', content: buildTraceAuditPrompt(product, profiles) },
    ]);

    return traceAuditOutputSchema.parse(result);
  } catch (err) {
    console.error('[ProductAnalyzeV2] AI trace audit failed:', err);
    return null;
  }
}

export async function analyzeAdviceWithAI(
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
  profiles: ProfileInputForScoring[],
  aiResult: ValidatedAiAnalyzeV2Result,
): Promise<AiAdviceOutput | null> {
  try {
    const model = new ChatOpenAI({ modelName: AI_MODEL, temperature: 0 });
    const structured = model.withStructuredOutput(adviceOutputSchema);
    const result = await structured.invoke([
      { role: 'system', content: buildAdviceSystemPrompt() },
      { role: 'user', content: buildAdvicePrompt(product, profiles, aiResult) },
    ]);

    return adviceOutputSchema.parse(result);
  } catch (err) {
    console.error('[ProductAnalyzeV2] AI advice pass failed:', err);
    return null;
  }
}

export function mergeCoreAndTraceOutputs(
  core: AiCoreAnalyzeOutput | null,
  traceAudit: AiTraceAuditOutput | null,
): AiAnalyzeV2Output | null {
  if (!core) {
    return null;
  }

  const traceAuditByProfile = new Map(
    (traceAudit?.profileInfo ?? []).map((profile) => [
      `${profile.profileType}:${profile.profileId}`,
      profile.traceDetections,
    ]),
  );

  return {
    product: core.product,
    profileInfo: core.profileInfo.map((profile) => {
      const auditedTraceDetections = traceAuditByProfile.get(
        `${profile.profileType}:${profile.profileId}`,
      );

      return {
        profileType: profile.profileType,
        profileId: profile.profileId,
        displayName: profile.displayName,
        allergenDetections: profile.allergenDetections,
        restrictionDetections: profile.restrictionDetections,
        traceDetections: auditedTraceDetections ?? [],
        ingredients: profile.ingredients,
        overallSummary: null,
        canIHaveThis: {
          can: false,
          status: 'no',
          reason: 'I cannot confirm this product is suitable for you.',
        },
        uncertaintyFlags: profile.uncertaintyFlags,
      };
    }),
  };
}

export function mergeAdviceIntoValidatedAiResult(
  aiResult: ValidatedAiAnalyzeV2Result,
  advice: AiAdviceOutput | null,
): ValidatedAiAnalyzeV2Result {
  if (!advice) {
    return aiResult;
  }

  const adviceByProfile = new Map(
    advice.profileInfo.map((profile) => [`${profile.profileType}:${profile.profileId}`, profile]),
  );

  return {
    ...aiResult,
    profileInfo: aiResult.profileInfo.map((profile) => {
      const adviceProfile = adviceByProfile.get(`${profile.profileType}:${profile.profileId}`);

      if (!adviceProfile) {
        return profile;
      }

      const overallSummary =
        typeof adviceProfile.overallSummary === 'string' &&
        adviceProfile.overallSummary.trim().length > 0
          ? normalizeOverallSummaryText(adviceProfile.overallSummary)
          : (profile.overallSummary ?? null);
      const canIHaveThisReason = adviceProfile.canIHaveThis.reason.trim();

      return {
        ...profile,
        overallSummary,
        canIHaveThis:
          canIHaveThisReason.length > 0
            ? {
                can: adviceProfile.canIHaveThis.can,
                status: adviceProfile.canIHaveThis.status,
                reason: canIHaveThisReason,
              }
            : profile.canIHaveThis,
      };
    }),
  };
}
