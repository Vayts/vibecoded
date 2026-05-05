import type { ProductRole } from './product-role.types.js';

export type AiAllergenDetectionSource =
  | 'off_allergen_tag'
  | 'off_trace_tag'
  | 'ingredient_text'
  | 'ai_inference';

export type AiRestrictionDetectionSource =
  | 'off_tag'
  | 'ingredient_text'
  | 'certification_tag'
  | 'ai_inference';

export type AiRestrictionStatus =
  | 'compatible'
  | 'semi_compatible'
  | 'not_compatible'
  | 'unclear'
  | 'requires_certification';

export type AiUncertaintyFlagType =
  | 'ambiguous_ingredient'
  | 'missing_ingredients'
  | 'missing_allergen_data'
  | 'low_confidence'
  | 'unknown_restriction_compatibility';

export type AiAllergenDetection = {
  allergy: string;
  detected: boolean;
  source: AiAllergenDetectionSource;
  confidence: number;
  ingredients: string[];
  evidence: string[];
};

export type AiRestrictionDetection = {
  restriction: string;
  status: AiRestrictionStatus;
  compatible?: boolean | null;
  source: AiRestrictionDetectionSource;
  confidence: number;
  ingredients: string[];
  evidence: string[];
};

export type AiCanIHaveThisAnswer = {
  can: boolean;
  reason: string;
};

export type AiProfileIngredient = {
  name: string;
  compatible: boolean;
  confidence: number;
  evidence: string[];
};

export type AiUncertaintyFlag = {
  type: AiUncertaintyFlagType;
  message: string;
};

export type AiProfileInfo = {
  profileType: 'user' | 'family_member';
  profileId: string;
  displayName?: string | null;
  allergenDetections: AiAllergenDetection[];
  restrictionDetections: AiRestrictionDetection[];
  ingredients: AiProfileIngredient[];
  overallSummary?: string | null;
  canIHaveThis: AiCanIHaveThisAnswer;
  uncertaintyFlags: AiUncertaintyFlag[];
};

export type AiProductAnalyzeV2Result = {
  product: {
    role: ProductRole;
    confidence: number;
    evidence: string[];
  };
  profileInfo: AiProfileInfo[];
};
