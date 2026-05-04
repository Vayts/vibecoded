import type {
  SafetyResult,
  GoalFitResult,
  NutritionResult,
  OverallResult,
} from '../types/scoring.types.js';
import { clampScore } from './nutrient-score.util.js';

function getRating(score: number, status: 'safe' | 'caution' | 'avoid'): OverallResult['rating'] {
  if (status === 'avoid') return 'avoid';
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good_choice';
  if (score >= 60) return 'okay';
  if (score >= 40) return 'use_with_caution';
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
    overallScore = clampScore(safety.score * 0.4 + goalFit.score * 0.35 + nutrition.score * 0.25);
    rating = getRating(overallScore, safety.status);
  }

  return {
    score: clampScore(overallScore),
    rating,
    summary: RATING_SUMMARIES[rating],
  };
}
