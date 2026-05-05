import type {
  SafetyResult,
  GoalFitResult,
  NutritionResult,
  OverallResult,
} from '../types/scoring.types.js';
import { clampScore } from './nutrient-score.util.js';

const OVERALL_WEIGHTS = {
  safety: 0.1,
  goalFit: 0.2,
  nutrition: 0.7,
} as const;

function applyNutritionLedCap(score: number, nutritionScore: number): number {
  if (nutritionScore < 35) return Math.min(score, 42);
  if (nutritionScore < 45) return Math.min(score, 50);
  if (nutritionScore < 55) return Math.min(score, 58);

  return score;
}

function applySafetyLedCap(score: number, safetyScore: number): number {
  if (safetyScore < 30) return Math.min(score, 30);

  return score;
}

function getRating(score: number, status: 'safe' | 'caution' | 'avoid'): OverallResult['rating'] {
  if (status === 'avoid') return 'avoid';
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good_choice';
  if (score >= 60) return 'okay';
  if (score >= 35) return 'use_with_caution';
  return 'avoid';
}

function buildFallbackOverallSummary(rating: OverallResult['rating']): string {
  switch (rating) {
    case 'excellent':
      return 'This product looks like a good match for your profile. Keep portion size in mind if you are tracking sugar, calories, or other nutrition goals.';
    case 'good_choice':
      return 'This product matches your main preferences and does not show major concerns. It looks like a reasonable choice for your profile.';
    case 'okay':
      return 'This product fits some of your preferences, but it also comes with a few trade-offs. It may still work in moderation.';
    case 'use_with_caution':
      return 'Most factors conflict with your preferences. A few things still work, but not enough to recommend it.';
    case 'avoid':
    default:
      return 'This product does not match your dietary needs. Even if some ingredients look fine, there is a clear risk based on your restrictions.';
  }
}

export function calculateOverallScore(
  safety: SafetyResult,
  goalFit: GoalFitResult,
  nutrition: NutritionResult,
  summaryOverride?: string | null,
): OverallResult {
  let overallScore: number;
  overallScore = clampScore(
    safety.score * OVERALL_WEIGHTS.safety +
      goalFit.score * OVERALL_WEIGHTS.goalFit +
      nutrition.score * OVERALL_WEIGHTS.nutrition,
  );
  overallScore = clampScore(applyNutritionLedCap(overallScore, nutrition.score));
  overallScore = clampScore(applySafetyLedCap(overallScore, safety.score));
  const rating = getRating(overallScore, safety.status);

  return {
    score: clampScore(overallScore),
    rating,
    summary:
      summaryOverride && summaryOverride.trim().length > 0
        ? summaryOverride.trim()
        : buildFallbackOverallSummary(rating),
  };
}
