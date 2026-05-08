import { mainGoalSchema } from '@acme/shared';
import type { ScoreReason } from '@acme/shared';
import type { z } from 'zod';
import type { ProductRole } from './product-role.types.js';

export type MainGoal = z.infer<typeof mainGoalSchema>;

export type RoleSource = 'ai' | 'fallback' | 'rule';

export interface RoleResult {
  value: ProductRole;
  source: RoleSource;
  confidence: number;
  validated: boolean;
  evidence: string[];
}

export interface SafetyResult {
  score: number;
  status: 'safe' | 'caution' | 'avoid';
  reasons: string[];
  matchedAllergens: string[];
  violatedRestrictions: string[];
  traceAllergens: string[];
  traceRestrictions: string[];
}

export interface GoalFitResult {
  score: number;
  goal: MainGoal | null;
  role: ProductRole;
  positives: string[];
  negatives: string[];
  details: Record<string, unknown>;
}

export interface NutritionResult {
  score: number;
  positives: string[];
  negatives: string[];
  details: Record<string, unknown>;
}

export interface OverallResult {
  score: number;
  rating: 'excellent' | 'good_choice' | 'okay' | 'use_with_caution' | 'avoid';
  summary: string;
}

export interface ProfileInputForScoring {
  profileId: string;
  profileType: 'user' | 'family_member';
  displayName: string | null;
  mainGoal: MainGoal | null;
  restrictions: string[];
  allergies: string[];
  otherAllergiesText: string | null;
}

export interface ProfileAnalysisResult {
  profileType: 'user' | 'family_member';
  profileId: string;
  displayName: string | null;
  role: RoleResult;
  safety: SafetyResult;
  goalFit: GoalFitResult;
  nutrition: NutritionResult;
  positives: ScoreReason[];
  negatives: ScoreReason[];
  overall: OverallResult;
}
