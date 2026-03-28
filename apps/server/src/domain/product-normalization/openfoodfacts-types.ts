export interface OpenFoodFactsIngredient {
  text?: unknown;
}

export interface OpenFoodFactsSelectedImageLocaleMap {
  [locale: string]: unknown;
}

export interface OpenFoodFactsSelectedImageSet {
  display?: OpenFoodFactsSelectedImageLocaleMap;
}

export interface OpenFoodFactsSelectedImages {
  front?: OpenFoodFactsSelectedImageSet;
  ingredients?: OpenFoodFactsSelectedImageSet;
  nutrition?: OpenFoodFactsSelectedImageSet;
}

export interface OpenFoodFactsNutriments {
  'energy-kcal_100g'?: unknown;
  proteins_100g?: unknown;
  fat_100g?: unknown;
  'saturated-fat_100g'?: unknown;
  carbohydrates_100g?: unknown;
  sugars_100g?: unknown;
  fiber_100g?: unknown;
  salt_100g?: unknown;
  sodium_100g?: unknown;
}

export interface OpenFoodFactsProduct {
  [key: string]: unknown;
  code?: unknown;
  product_name?: unknown;
  brands?: unknown;
  image_url?: unknown;
  ingredients_text?: unknown;
  nutriscore_grade?: unknown;
  nutriscore_score?: unknown;
  categories?: unknown;
  categories_hierarchy?: unknown;
  quantity?: unknown;
  serving_size?: unknown;
  allergens_tags?: unknown;
  additives_tags?: unknown;
  additives_n?: unknown;
  traces_tags?: unknown;
  countries?: unknown;
  countries_tags?: unknown;
  ingredients?: unknown;
  nutriments?: unknown;
  ecoscore_grade?: unknown;
  ecoscore_score?: unknown;
  image_front_url?: unknown;
  image_ingredients_url?: unknown;
  image_nutrition_url?: unknown;
  selected_images?: unknown;
}
