import type { ProfileAnalysisResult } from './scoring.types.js';
import type { AiProfileInfo } from './ai-analyze.types.js';
import type { ProductRole } from './product-role.types.js';

export interface AnalyzeBarcodeV2Request {
  barcode: string;
}

export type SubscriptionReason =
  | 'active_subscription'
  | 'missing_subscription'
  | 'inactive_subscription'
  | 'expired_subscription';

export interface FamilyMemberAnalysisResult extends Omit<ProfileAnalysisResult, 'profileType'> {
  profileType: 'family_member';
  familyMemberId: string;
}

export interface AiDebugProduct {
  role: ProductRole;
  confidence: number;
  validated: boolean;
  evidence: string[];
}

export interface AiDebugSection {
  product: AiDebugProduct;
  profileInfo: AiProfileInfo[];
}

export interface AnalyzeBarcodeV2Response {
  barcode: string;
  product: {
    name: string | null;
    brand: string | null;
    imageUrl: string | null;
    ingredients: string[];
    allergens: string[];
    traces: string[];
    additives: string[];
    nutrition: {
      caloriesPer100g: number | null;
      caloriesPerServing: number | null;
      proteinPer100g: number | null;
      carbsPer100g: number | null;
      sugarPer100g: number | null;
      fatPer100g: number | null;
      saturatedFatPer100g: number | null;
      fiberPer100g: number | null;
      sodiumPer100g: number | null;
    };
  };
  analysis: {
    mainProfile: ProfileAnalysisResult & { profileType: 'user' };
    familyMembers: FamilyMemberAnalysisResult[];
    subscription: {
      analyzedFamilyMembers: boolean;
      reason: SubscriptionReason;
    };
  };
  ai: AiDebugSection;
}
