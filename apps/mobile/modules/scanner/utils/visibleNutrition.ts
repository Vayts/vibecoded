import type { ScannerProductAnalysisResult } from '@acme/shared';

export type VisibleNutrition = Pick<
  ScannerProductAnalysisResult['product']['nutrition'],
  | 'caloriesPer100g'
  | 'proteinPer100g'
  | 'sugarPer100g'
  | 'fatPer100g'
  | 'saturatedFatPer100g'
  | 'fiberPer100g'
  | 'sodiumPer100g'
>;

export type VisibleNutritionKey = keyof VisibleNutrition;

export const getVisibleNutrition = (
  nutrition: ScannerProductAnalysisResult['product']['nutrition'] | null | undefined,
): VisibleNutrition => ({
  caloriesPer100g: nutrition?.caloriesPer100g ?? null,
  proteinPer100g: nutrition?.proteinPer100g ?? null,
  sugarPer100g: nutrition?.sugarPer100g ?? null,
  fatPer100g: nutrition?.fatPer100g ?? null,
  saturatedFatPer100g: nutrition?.saturatedFatPer100g ?? null,
  fiberPer100g: nutrition?.fiberPer100g ?? null,
  sodiumPer100g: nutrition?.sodiumPer100g ?? null,
});