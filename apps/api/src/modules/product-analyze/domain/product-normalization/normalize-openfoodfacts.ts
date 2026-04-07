import type { BarcodeLookupProduct } from '@acme/shared';
import type {
  OpenFoodFactsIngredient,
  OpenFoodFactsNutriments,
  OpenFoodFactsProduct,
  OpenFoodFactsSelectedImages,
} from './openfoodfacts-types';

const NULL_LIKE = new Set([
  'null',
  '/null',
  'n/a',
  'none',
  'undefined',
  '-',
  '/',
  '',
]);

const normalizeNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return NULL_LIKE.has(normalized.toLowerCase())
    ? null
    : normalized.length > 0
      ? normalized
      : null;
};

const normalizeNullableNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const cleanTaxonomyValue = (value: string): string => {
  const withoutPrefix = value.includes(':')
    ? value.split(':').slice(1).join(':')
    : value;
  return withoutPrefix.replace(/[-_]/g, ' ').trim();
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeNullableString(entry))
    .filter((entry): entry is string => Boolean(entry));
};

const normalizeLabelArray = (value: unknown): string[] =>
  normalizeStringArray(value).map(cleanTaxonomyValue);

const normalizeCommaSeparatedString = (value: unknown): string[] => {
  const normalized = normalizeNullableString(value);

  if (!normalized) {
    return [];
  }

  return normalized
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const pickLocalizedField = (
  product: OpenFoodFactsProduct,
  baseKey: string,
): string | null => {
  const localeCandidates = [
    normalizeNullableString(product.lang),
    normalizeNullableString(product.lc),
  ].filter((locale): locale is string => Boolean(locale));

  for (const locale of localeCandidates) {
    const localizedValue = normalizeNullableString(
      product[`${baseKey}_${locale}`],
    );
    if (localizedValue) {
      return localizedValue;
    }
  }

  const directValue = normalizeNullableString(product[baseKey]);
  if (directValue) {
    return directValue;
  }

  const fallbackEntry = Object.entries(product).find(([key, value]) => {
    return (
      key.startsWith(`${baseKey}_`) && Boolean(normalizeNullableString(value))
    );
  });

  return fallbackEntry ? normalizeNullableString(fallbackEntry[1]) : null;
};

const normalizeIngredients = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((ingredient) => {
      if (!ingredient || typeof ingredient !== 'object') {
        return null;
      }

      return normalizeNullableString(
        (ingredient as OpenFoodFactsIngredient).text,
      );
    })
    .filter((entry): entry is string => Boolean(entry));
};

const normalizeCategories = (
  product: OpenFoodFactsProduct,
): { categories: string | null; categoryTags: string[] } => {
  const hierarchyLabels = normalizeLabelArray(product.categories_hierarchy);
  if (hierarchyLabels.length > 0) {
    return {
      categories: hierarchyLabels.join(', '),
      categoryTags: hierarchyLabels,
    };
  }

  const categories = normalizeNullableString(product.categories);
  if (!categories) {
    return { categories: null, categoryTags: [] };
  }

  const categoryTags = categories
    .split(',')
    .map((entry) => cleanTaxonomyValue(entry.trim()))
    .filter(Boolean);
  return {
    categories:
      categoryTags.length > 0
        ? categoryTags.join(', ')
        : cleanTaxonomyValue(categories),
    categoryTags,
  };
};

const getSelectedImageUrl = (
  selectedImages: OpenFoodFactsSelectedImages | null,
  imageType: keyof OpenFoodFactsSelectedImages,
  localeCandidates: string[],
): string | null => {
  const selectedImage = selectedImages?.[imageType];
  if (!selectedImage?.display) {
    return null;
  }

  for (const locale of localeCandidates) {
    const localizedUrl = normalizeNullableString(selectedImage.display[locale]);
    if (localizedUrl) {
      return localizedUrl;
    }
  }

  const firstDisplayValue = Object.values(selectedImage.display).find((value) =>
    Boolean(normalizeNullableString(value)),
  );
  return firstDisplayValue ? normalizeNullableString(firstDisplayValue) : null;
};

export const normalizeOpenFoodFactsProduct = (
  barcode: string,
  product: OpenFoodFactsProduct,
): BarcodeLookupProduct => {
  const localeCandidates = [
    normalizeNullableString(product.lang),
    normalizeNullableString(product.lc),
  ].filter((locale): locale is string => Boolean(locale));
  const selectedImages =
    product.selected_images as OpenFoodFactsSelectedImages | null;
  const normalizedCategories = normalizeCategories(product);
  const nutriments = product.nutriments as OpenFoodFactsNutriments | undefined;
  const countriesFromTags = normalizeLabelArray(product.countries_tags);

  return {
    code: normalizeNullableString(product.code) ?? barcode,
    product_name: pickLocalizedField(product, 'product_name'),
    brands: normalizeNullableString(product.brands),
    image_url: normalizeNullableString(product.image_url),
    ingredients_text: pickLocalizedField(product, 'ingredients_text'),
    nutriscore_grade: normalizeNullableString(product.nutriscore_grade),
    categories: normalizedCategories.categories,
    quantity: normalizeNullableString(product.quantity),
    serving_size: normalizeNullableString(product.serving_size),
    ingredients: normalizeIngredients(product.ingredients),
    allergens: normalizeLabelArray(product.allergens_tags),
    additives: normalizeLabelArray(product.additives_tags),
    additives_count: normalizeNullableNumber(product.additives_n),
    traces: normalizeLabelArray(product.traces_tags),
    countries:
      countriesFromTags.length > 0
        ? countriesFromTags
        : normalizeCommaSeparatedString(product.countries),
    category_tags: normalizedCategories.categoryTags,
    images: {
      front_url:
        getSelectedImageUrl(selectedImages, 'front', localeCandidates) ??
        normalizeNullableString(product.image_front_url) ??
        normalizeNullableString(product.image_url),
      ingredients_url:
        getSelectedImageUrl(selectedImages, 'ingredients', localeCandidates) ??
        normalizeNullableString(product.image_ingredients_url),
      nutrition_url:
        getSelectedImageUrl(selectedImages, 'nutrition', localeCandidates) ??
        normalizeNullableString(product.image_nutrition_url),
    },
    nutrition: {
      energy_kcal_100g: normalizeNullableNumber(
        nutriments?.['energy-kcal_100g'],
      ),
      proteins_100g: normalizeNullableNumber(nutriments?.proteins_100g),
      fat_100g: normalizeNullableNumber(nutriments?.fat_100g),
      saturated_fat_100g: normalizeNullableNumber(
        nutriments?.['saturated-fat_100g'],
      ),
      carbohydrates_100g: normalizeNullableNumber(
        nutriments?.carbohydrates_100g,
      ),
      sugars_100g: normalizeNullableNumber(nutriments?.sugars_100g),
      fiber_100g: normalizeNullableNumber(nutriments?.fiber_100g),
      salt_100g: normalizeNullableNumber(nutriments?.salt_100g),
      sodium_100g: normalizeNullableNumber(nutriments?.sodium_100g),
    },
    scores: {
      nutriscore_grade: normalizeNullableString(product.nutriscore_grade),
      nutriscore_score: normalizeNullableNumber(product.nutriscore_score),
      ecoscore_grade: normalizeNullableString(product.ecoscore_grade),
      ecoscore_score: normalizeNullableNumber(product.ecoscore_score),
    },
  };
};
