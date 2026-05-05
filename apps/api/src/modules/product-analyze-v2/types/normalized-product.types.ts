export interface NormalizedProductV2 {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  ingredients: string[];
  allergens: string[];
  traces: string[];
  additives: string[];
  categories: string[];
  servingSizeText: string | null;
  servingSizeGrams: number | null;
  servingSizeMl: number | null;
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
    saltPer100g: number | null;
  };
}
