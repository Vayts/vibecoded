import type {
  BarcodeLookupProduct,
  NegativeProductAnalysisItem,
  OnboardingResponse,
  PersonalAnalysisResult,
  PositiveProductAnalysisItem,
} from '@acme/shared';
import { DEFAULT_ONBOARDING_RESPONSE } from '@acme/shared';

import { buildProductAnalysisFallback } from './productAnalysisFallback';
import { dedupeAnalysisItemsByLabel } from './productAnalysisItemDedup';
import { applyGoalAndPrioritySignals } from './personalProductProfileSignals';
import {
  allergyLabels,
  allergyTokens,
  limitVisiblePersonalNegatives,
  limitVisiblePersonalPositives,
} from './personalProductAnalysisConfig';
import { getRestrictionConflict } from './personalProductRestrictionRules';

const clampScore = (score: number): number => Math.max(0, Math.min(100, score));

const createPositive = (
  key: string,
  label: string,
  description: string,
  value: number | null,
  unit: string | null,
  overview: string,
): PositiveProductAnalysisItem => ({
  key,
  label,
  description,
  value,
  unit,
  severity: 'good',
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
): NegativeProductAnalysisItem => ({
  key,
  label,
  description,
  value,
  unit,
  severity,
  overview,
});

const getFitLabel = (score: number): PersonalAnalysisResult['fitLabel'] => {
  if (score >= 80) return 'great_fit';
  if (score >= 60) return 'good_fit';
  if (score >= 40) return 'neutral';
  return 'poor_fit';
};

const getSearchPool = (product: BarcodeLookupProduct): string[] => {
  return [
    ...(product.ingredients ?? []),
    ...(product.allergens ?? []),
    ...(product.traces ?? []),
    ...(product.additives ?? []),
    ...(product.category_tags ?? []),
    product.ingredients_text ?? '',
    product.product_name ?? '',
    product.brands ?? '',
    product.categories ?? '',
    product.quantity ?? '',
    product.serving_size ?? '',
  ]
    .map((value) => value.toLowerCase())
    .filter(Boolean);
};

const hasAnyToken = (values: string[], tokens: string[]): boolean => {
  return values.some((value) => tokens.some((token) => value.includes(token)));
};

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
  const searchPool = getSearchPool(product);
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

  for (const allergy of onboarding.allergies) {
    const tokens = allergyTokens[allergy] ?? [];
    const allergyLabel = allergyLabels[allergy] ?? allergy;
    if (tokens.length === 0) continue;

    if (
      hasAnyToken(
        product.allergens.map((value) => value.toLowerCase()),
        tokens,
      )
    ) {
      fitScore -= 40;
      negatives.set(
        `allergy-${allergy.toLowerCase()}`,
        createNegative(
          `allergy-${allergy.toLowerCase()}`,
          `${allergyLabel} allergy`,
          `Contains ${allergyLabel.toLowerCase()} from your allergy list`,
          null,
          null,
          `This product explicitly lists ${allergyLabel.toLowerCase()} as an allergen.`,
          'bad',
        ),
      );
      personalizedNegativeKeys.add(`allergy-${allergy.toLowerCase()}`);
      continue;
    }

    if (
      hasAnyToken(
        product.traces.map((value) => value.toLowerCase()),
        tokens,
      )
    ) {
      fitScore -= 16;
      negatives.set(
        `trace-${allergy.toLowerCase()}`,
        createNegative(
          `trace-${allergy.toLowerCase()}`,
          `${allergyLabel} trace`,
          `May contain traces of ${allergyLabel.toLowerCase()}`,
          null,
          null,
          `This product lists possible traces of ${allergyLabel.toLowerCase()}.`,
        ),
      );
      personalizedNegativeKeys.add(`trace-${allergy.toLowerCase()}`);
    }
  }

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
        ),
      );
      personalizedNegativeKeys.add(conflict.key);
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
