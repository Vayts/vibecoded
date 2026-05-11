import type { NormalizedProduct } from '@acme/shared';
import { resolveCanonicalProductImageUrl } from '../../../shared/utils/product-image.js';

const hasUsefulText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const hasUsefulList = (values: string[]): boolean =>
  values.some((value) => value.trim().length > 0);

const sameStringArray = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const hasUsefulImage = (product: NormalizedProduct): boolean =>
  resolveCanonicalProductImageUrl(product.image_url, product.images) !== null;

const hasUsefulNutrition = (product: NormalizedProduct): boolean =>
  Object.values(product.nutrition).some(
    (value) => typeof value === 'number' && Number.isFinite(value),
  );

const hasDifferentNutrition = (left: NormalizedProduct, right: NormalizedProduct): boolean =>
  Object.entries(left.nutrition).some(
    ([key, value]) => value !== right.nutrition[key as keyof typeof right.nutrition],
  );

const pickText = (fresh: string | null, existing: string | null): string | null =>
  hasUsefulText(fresh) ? fresh : existing;

const pickList = (fresh: string[], existing: string[]): string[] =>
  hasUsefulList(fresh) ? fresh : existing;

const pickNumber = (fresh: number | null, existing: number | null): number | null =>
  typeof fresh === 'number' && Number.isFinite(fresh) ? fresh : existing;

export const shouldRefreshPhotoProduct = (
  existing: NormalizedProduct,
  fresh: NormalizedProduct,
): boolean => {
  return (
    (hasUsefulText(fresh.product_name) && fresh.product_name !== existing.product_name) ||
    (hasUsefulText(fresh.brands) && fresh.brands !== existing.brands) ||
    (hasUsefulText(fresh.ingredients_text) &&
      fresh.ingredients_text !== existing.ingredients_text) ||
    (hasUsefulText(fresh.categories) && fresh.categories !== existing.categories) ||
    (hasUsefulText(fresh.quantity) && fresh.quantity !== existing.quantity) ||
    (hasUsefulText(fresh.serving_size) && fresh.serving_size !== existing.serving_size) ||
    (hasUsefulList(fresh.ingredients) &&
      !sameStringArray(existing.ingredients, fresh.ingredients)) ||
    (hasUsefulList(fresh.allergens) && !sameStringArray(existing.allergens, fresh.allergens)) ||
    (hasUsefulList(fresh.additives) && !sameStringArray(existing.additives, fresh.additives)) ||
    (hasUsefulList(fresh.traces) && !sameStringArray(existing.traces, fresh.traces)) ||
    (hasUsefulList(fresh.category_tags) &&
      !sameStringArray(existing.category_tags, fresh.category_tags)) ||
    (hasUsefulNutrition(fresh) && hasDifferentNutrition(existing, fresh)) ||
    (!hasUsefulImage(existing) && hasUsefulImage(fresh))
  );
};

export const mergePhotoProduct = (
  existing: NormalizedProduct,
  fresh: NormalizedProduct,
): NormalizedProduct => ({
  ...existing,
  ...fresh,
  code: existing.code,
  product_name: pickText(fresh.product_name, existing.product_name),
  brands: pickText(fresh.brands, existing.brands),
  image_url: pickText(fresh.image_url, existing.image_url),
  ingredients_text: pickText(fresh.ingredients_text, existing.ingredients_text),
  nutriscore_grade: pickText(fresh.nutriscore_grade, existing.nutriscore_grade),
  categories: pickText(fresh.categories, existing.categories),
  quantity: pickText(fresh.quantity, existing.quantity),
  serving_size: pickText(fresh.serving_size, existing.serving_size),
  ingredients: pickList(fresh.ingredients, existing.ingredients),
  allergens: pickList(fresh.allergens, existing.allergens),
  additives: pickList(fresh.additives, existing.additives),
  traces: pickList(fresh.traces, existing.traces),
  countries: pickList(fresh.countries, existing.countries),
  category_tags: pickList(fresh.category_tags, existing.category_tags),
  additives_count: pickNumber(fresh.additives_count, existing.additives_count),
  images: hasUsefulImage(fresh) ? fresh.images : existing.images,
  nutrition: {
    energy_kcal_100g: pickNumber(
      fresh.nutrition.energy_kcal_100g,
      existing.nutrition.energy_kcal_100g,
    ),
    proteins_100g: pickNumber(fresh.nutrition.proteins_100g, existing.nutrition.proteins_100g),
    fat_100g: pickNumber(fresh.nutrition.fat_100g, existing.nutrition.fat_100g),
    saturated_fat_100g: pickNumber(
      fresh.nutrition.saturated_fat_100g,
      existing.nutrition.saturated_fat_100g,
    ),
    carbohydrates_100g: pickNumber(
      fresh.nutrition.carbohydrates_100g,
      existing.nutrition.carbohydrates_100g,
    ),
    sugars_100g: pickNumber(fresh.nutrition.sugars_100g, existing.nutrition.sugars_100g),
    fiber_100g: pickNumber(fresh.nutrition.fiber_100g, existing.nutrition.fiber_100g),
    salt_100g: pickNumber(fresh.nutrition.salt_100g, existing.nutrition.salt_100g),
    sodium_100g: pickNumber(fresh.nutrition.sodium_100g, existing.nutrition.sodium_100g),
  },
  scores: {
    nutriscore_grade: pickText(fresh.scores.nutriscore_grade, existing.scores.nutriscore_grade),
    nutriscore_score: pickNumber(fresh.scores.nutriscore_score, existing.scores.nutriscore_score),
    ecoscore_grade: pickText(fresh.scores.ecoscore_grade, existing.scores.ecoscore_grade),
    ecoscore_score: pickNumber(fresh.scores.ecoscore_score, existing.scores.ecoscore_score),
  },
});
