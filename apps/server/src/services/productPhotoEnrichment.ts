import { barcodeLookupProductSchema } from '@acme/shared';

import type { ResearchedProduct } from './productPhotoLookupSchema';
import { photoIdentificationSchema } from './productPhotoLookupSchema';

const splitDelimitedValues = (value: string | null): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 1)
    .slice(0, 24);
};

const normalizeTag = (value: string): string => {
  return value.toLowerCase().replace(/[_-]/g, ' ').trim();
};

const unique = (values: Array<string | null | undefined>): string[] => {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => value.trim()),
    ),
  );
};

const parseAllergenSignals = (text: string | null) => {
  const normalized = text?.toLowerCase() ?? '';

  return {
    allergens: unique(
      ['milk', 'soy', 'egg', 'sesame', 'gluten', 'peanut', 'almond', 'hazelnut']
        .filter((token) => normalized.includes(token)),
    ),
    traces: normalized.includes('may contain')
      ? unique(
          ['milk', 'soy', 'egg', 'sesame', 'gluten', 'peanut', 'almond', 'hazelnut']
            .filter((token) => normalized.includes(token)),
        )
      : [],
  };
};

export const enrichPhotoProduct = (
  product: ResearchedProduct,
  identification: ReturnType<typeof photoIdentificationSchema.parse>,
) => {
  const ingredientCandidates = splitDelimitedValues(
    product.ingredients_text ?? identification.visibleIngredientsText,
  );
  const allergenSignals = parseAllergenSignals(identification.visibleAllergensText);
  const categoryTags = unique([
    ...product.category_tags,
    identification.categoryGuess,
    ...identification.animalProductSignals,
  ]).map(normalizeTag);
  const categories = unique([product.categories, identification.categoryGuess, ...categoryTags]).join(', ');
  const nutriScoreGrade = product.nutriscore_grade ?? product.scores.nutriscore_grade;

  return barcodeLookupProductSchema.parse({
    ...product,
    product_name: product.product_name ?? identification.productName,
    brands: product.brands ?? identification.brand,
    nutriscore_grade: nutriScoreGrade,
    ingredients_text: product.ingredients_text ?? identification.visibleIngredientsText,
    ingredients: product.ingredients.length > 0 ? product.ingredients : ingredientCandidates,
    allergens: product.allergens.length > 0 ? product.allergens : allergenSignals.allergens,
    traces: product.traces.length > 0 ? product.traces : allergenSignals.traces,
    categories: categories.length > 0 ? categories : null,
    category_tags: categoryTags,
    scores: {
      ...product.scores,
      nutriscore_grade: product.scores.nutriscore_grade ?? nutriScoreGrade,
    },
  });
};