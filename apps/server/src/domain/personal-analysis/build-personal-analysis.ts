import type {
  BarcodeLookupProduct,
  NegativeProductAnalysisItem,
  OnboardingResponse,
  PersonalAnalysisResult,
  PositiveProductAnalysisItem,
} from '@acme/shared';
import { DEFAULT_ONBOARDING_RESPONSE } from '@acme/shared';

import { buildProductAnalysisFallback } from '../product-analysis/build-fallback-analysis';
import { dedupeAnalysisItemsByLabel } from '../product-analysis/item-dedup';
import { applyGoalAndPrioritySignals } from './profile-signals';
import {
  limitVisiblePersonalNegatives,
  limitVisiblePersonalPositives,
} from './config';
import {
  getRestrictionConflict,
  getRestrictionSearchPool,
  RESTRICTION_COMPATIBLE_LABELS,
} from './restriction-rules';

const clampScore = (score: number): number => Math.max(0, Math.min(100, score));

const createPositive = (
  key: string,
  label: string,
  description: string,
  value: number | null,
  unit: string | null,
  overview: string,
  per: '100g' | null = '100g',
  category: 'nutrition' | 'diet' | 'ingredients' | 'restriction' = 'nutrition',
): PositiveProductAnalysisItem => ({
  key,
  label,
  description,
  value,
  unit,
  per,
  severity: 'good',
  category,
  overview,
});

const createNegative = (
  key: string,
  label: string,
  description: string,
  value: number | null,
  unit: string | null,
  overview: string,
  severity: NegativeProductAnalysisItem['severity'] = 'warning',
  per: '100g' | null = '100g',
  category: 'nutrition' | 'diet' | 'ingredients' | 'restriction' = 'nutrition',
): NegativeProductAnalysisItem => ({
  key,
  label,
  description,
  value,
  unit,
  per,
  severity,
  category,
  overview,
});

const getFitLabel = (score: number): PersonalAnalysisResult['fitLabel'] => {
  if (score >= 80) return 'great_fit';
  if (score >= 60) return 'good_fit';
  if (score >= 40) return 'neutral';
  return 'poor_fit';
};

/** Exported for use in Phase 2 AI runners that update fitScore after heuristic analysis. */
export const getFitLabelFromScore = getFitLabel;

export const buildPersonalProductAnalysis = (
  product: BarcodeLookupProduct,
  onboarding: OnboardingResponse = DEFAULT_ONBOARDING_RESPONSE,
): PersonalAnalysisResult => {
  const personalizedPositiveKeys = new Set<string>();
  const personalizedNegativeKeys = new Set<string>();
  const overall = buildProductAnalysisFallback(product);
  const positives = new Map<string, PositiveProductAnalysisItem>(
    overall.positives.map((item) => [item.key, item]),
  );
  const negatives = new Map<string, NegativeProductAnalysisItem>(
    overall.negatives.map((item) => [item.key, item]),
  );
  const searchPool = getRestrictionSearchPool(product);
  let fitScore = overall.overallScore;
  let dealbreakerSummary: string | null = null;

  fitScore += applyGoalAndPrioritySignals(
    product,
    onboarding,
    positives,
    negatives,
    personalizedPositiveKeys,
    personalizedNegativeKeys,
    { createPositive, createNegative },
  );

  // NOTE: Allergen detection is intentionally omitted from Phase 1.
  // The ingredient analysis AI (Phase 2) handles allergens by flagging
  // each conflicting ingredient as 'bad'. The runner applies score
  // penalties and adds negatives after Phase 2 completes.

  for (const restriction of onboarding.restrictions) {
    const conflict = getRestrictionConflict(restriction, searchPool);

    if (conflict) {
      if (conflict.forceZero) {
        fitScore = 0;
        dealbreakerSummary = conflict.overview;
      } else {
        fitScore -= 20;
      }

      negatives.set(
        conflict.key,
        createNegative(
          conflict.key,
          conflict.label,
          conflict.description,
          null,
          null,
          conflict.overview,
          conflict.severity,
          null,
          'restriction',
        ),
      );
      personalizedNegativeKeys.add(conflict.key);
    } else {
      const compatLabel = RESTRICTION_COMPATIBLE_LABELS[restriction];
      if (compatLabel) {
        const key = `restriction-${restriction.toLowerCase()}`;
        positives.set(
          key,
          createPositive(
            key,
            compatLabel.label,
            compatLabel.description,
            null,
            null,
            compatLabel.overview,
            null,
            'restriction',
          ),
        );
        personalizedPositiveKeys.add(key);
      }
    }
  }

  fitScore = clampScore(fitScore);

  const summary =
    dealbreakerSummary ??
    (onboarding.onboardingCompleted
      ? 'Personal fit combines the product facts with your onboarding goals, priorities, restrictions, and allergies.'
      : 'Personal fit shows the product facts first. Complete onboarding to add profile-specific guidance.');

  return {
    fitScore,
    fitLabel: getFitLabel(fitScore),
    summary,
    positives: limitVisiblePersonalPositives(
      dedupeAnalysisItemsByLabel(Array.from(positives.values()), {
        preferredKeys: personalizedPositiveKeys,
      }),
    ),
    negatives: limitVisiblePersonalNegatives(
      dedupeAnalysisItemsByLabel(Array.from(negatives.values()), {
        preferredKeys: personalizedNegativeKeys,
      }),
    ),
  };
};
