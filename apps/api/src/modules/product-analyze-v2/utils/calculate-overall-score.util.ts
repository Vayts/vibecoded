import type {
  SafetyResult,
  GoalFitResult,
  NutritionResult,
  OverallResult,
} from '../types/scoring.types.js';
import { clampScore } from './nutrient-score.util.js';

const OVERALL_WEIGHTS = {
  safety: 0.2,
  goalFit: 0.2,
  nutrition: 0.6,
} as const;

function applyNutritionLedCap(score: number, nutritionScore: number): number {
  if (nutritionScore < 35) return Math.min(score, 42);
  if (nutritionScore < 45) return Math.min(score, 50);
  if (nutritionScore < 55) return Math.min(score, 58);

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

const RATING_SUMMARIES: Record<OverallResult['rating'], string> = {
  excellent: 'Excellent choice for your profile and goals.',
  good_choice: 'Good choice for this goal when used in reasonable portions.',
  okay: 'Acceptable choice, but moderation is advised.',
  use_with_caution: 'Use with caution — some concerns for your profile.',
  avoid: 'Not recommended based on your health profile.',
};

export function calculateOverallScore(
  safety: SafetyResult,
  goalFit: GoalFitResult,
  nutrition: NutritionResult,
): OverallResult {
  let overallScore: number;
  let rating: OverallResult['rating'];

  if (safety.score === 0) {
    overallScore = Math.min(goalFit.score, 20);
    rating = 'avoid';
  } else if (safety.score < 40) {
    overallScore = Math.min(goalFit.score, 40);
    rating = 'use_with_caution';
  } else {
    overallScore = clampScore(
      safety.score * OVERALL_WEIGHTS.safety +
        goalFit.score * OVERALL_WEIGHTS.goalFit +
        nutrition.score * OVERALL_WEIGHTS.nutrition,
    );
    overallScore = clampScore(applyNutritionLedCap(overallScore, nutrition.score));
    rating = getRating(overallScore, safety.status);
  }

  return {
    score: clampScore(overallScore),
    rating,
    summary: RATING_SUMMARIES[rating],
  };
}
