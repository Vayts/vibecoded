import type { CompareProductsProfileResult, ScoreReason } from '@acme/shared';
import type { PhotoOcrPayloadV2 } from './analyze-photo-v2.types.js';
import type {
  GoalFitResult,
  NutritionResult,
  OverallResult,
  SafetyResult,
} from './scoring.types.js';
import type {
  AiAllergenDetection,
  AiCanIHaveThisAnswer,
  AiProfileIngredient,
  AiRestrictionDetection,
  AiTraceDetection,
} from './ai-analyze.types.js';

export interface AnalyzeBarcodeV2ProfileAnalysis {
  safety: SafetyResult;
  goalFit: GoalFitResult;
  nutrition: NutritionResult;
  positives: ScoreReason[];
  negatives: ScoreReason[];
  overall: OverallResult;
}

export interface AnalyzeBarcodeV2ProfileAi {
  allergenDetections: AiAllergenDetection[];
  restrictionDetections: AiRestrictionDetection[];
  traceDetections: AiTraceDetection[];
  ingredients: AiProfileIngredient[];
  canIHaveThis: AiCanIHaveThisAnswer;
}

export interface AnalyzeBarcodeV2ProfileResult {
  profileId: string;
  type: 'user' | 'family_member';
  displayName: string | null;
  analysis: AnalyzeBarcodeV2ProfileAnalysis;
  ai: AnalyzeBarcodeV2ProfileAi;
}

export interface AnalyzeBarcodeV2Response {
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
  profiles: AnalyzeBarcodeV2ProfileResult[];
}

export interface CompareProductV2Result extends AnalyzeBarcodeV2Response {
  barcode: string;
  productId?: string;
  scanId?: string;
}

export type CompareProductV2Source =
  | {
      type: 'barcode';
      barcode: string;
    }
  | {
      type: 'photo';
      imageBase64: string;
      ocr?: PhotoOcrPayloadV2;
    };

export interface CompareProductsV2Response {
  comparisonId: string;
  products: CompareProductV2Result[];
  profileResults: CompareProductsProfileResult[];
}
