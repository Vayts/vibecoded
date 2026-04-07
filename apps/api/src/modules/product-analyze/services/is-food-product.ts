import type { NormalizedProduct } from '@acme/shared';

/**
 * Non-food category keywords. If ALL categories match one of these,
 * the product is treated as non-food.
 */
const NON_FOOD_KEYWORDS = [
  'electronics',
  'clothing',
  'apparel',
  'footwear',
  'furniture',
  'hardware',
  'software',
  'toys',
  'books',
  'stationery',
  'cosmetics',
  'perfume',
  'cleaning',
  'detergent',
  'pet supplies',
  'automotive',
  'garden',
  'tools',
  'office supplies',
];

/**
 * Determines whether a normalized product is a food/beverage product.
 * Returns false for non-food products or products with insufficient data.
 */
export const isFoodProduct = (product: NormalizedProduct): boolean => {
  // Must have at least a product name
  if (!product.product_name) {
    return false;
  }

  // Check categories for non-food signals
  const categoryText = [product.categories ?? '', ...product.category_tags]
    .join(' ')
    .toLowerCase();

  if (categoryText.length > 0) {
    const hasNonFoodCategory = NON_FOOD_KEYWORDS.some((keyword) =>
      categoryText.includes(keyword),
    );
    const hasFoodSignal =
      product.ingredients.length > 0 ||
      product.ingredients_text !== null ||
      product.nutrition.energy_kcal_100g !== null ||
      product.nutrition.proteins_100g !== null;

    if (hasNonFoodCategory && !hasFoodSignal) {
      return false;
    }
  }

  // A product with ingredients or nutrition data is almost certainly food
  if (
    product.ingredients.length > 0 ||
    product.ingredients_text !== null ||
    product.nutrition.energy_kcal_100g !== null
  ) {
    return true;
  }

  // Product with food-related categories but no nutrition — accept with caution
  if (product.categories || product.category_tags.length > 0) {
    return true;
  }

  // No ingredients, no nutrition, no categories — not enough evidence
  return false;
};
