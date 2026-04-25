import {
  type BarcodeLookupProduct,
  type BarcodeLookupNotFoundResponse,
  type ComparisonProductPreview,
  type DietCompatibility,
  type NormalizedProduct,
  type ProductPreview,
  type ScannerLookupSource,
} from '@acme/shared';
import { createProduct, findByBarcode } from '../repositories/productRepository';
import { findProductIdByBarcode } from '../repositories/scanRepository';
import { lookupBarcode } from '../services/openfoodfacts-client';
import { searchProductByBarcode } from '../services/websearch-fallback';
import { isFoodProduct } from '../services/is-food-product';

export interface ResolvedProductResult {
  product: NormalizedProduct;
  productId: string;
  wasExistingInDb: boolean;
}

export const createNotFoundResponse = (
  barcode: string,
  source: ScannerLookupSource,
): BarcodeLookupNotFoundResponse => ({
  success: false,
  barcode,
  source,
  error: 'PRODUCT_NOT_FOUND',
});

export const resolveProduct = async (barcode: string): Promise<ResolvedProductResult | null> => {
  let product: NormalizedProduct | null = await findByBarcode(barcode);
  const wasExistingInDb = Boolean(product);

  if (!product) {
    try {
      product = await lookupBarcode(barcode);
    } catch {
      product = null;
    }
  }

  if (!product) {
    product = await searchProductByBarcode(barcode);
  }

  if (!product || !isFoodProduct(product)) {
    return null;
  }

  if (wasExistingInDb) {
    const productId = await findProductIdByBarcode(product.code);

    return {
      product,
      productId: productId!,
      wasExistingInDb,
    };
  }

  const savedProduct = await createProduct(product);
  const productId = await findProductIdByBarcode(savedProduct.code);

  return {
    product: savedProduct,
    productId: productId!,
    wasExistingInDb,
  };
};

export const toBarcodeLookupProduct = (
  product: NormalizedProduct,
  dietCompatibility?: DietCompatibility,
): BarcodeLookupProduct => ({
  code: product.code,
  product_name: product.product_name,
  brands: product.brands,
  image_url: product.image_url,
  ingredients_text: product.ingredients_text,
  nutriscore_grade: product.nutriscore_grade,
  categories: product.categories,
  quantity: product.quantity,
  serving_size: product.serving_size,
  ingredients: product.ingredients,
  allergens: product.allergens,
  additives: product.additives,
  additives_count: product.additives_count,
  traces: product.traces,
  countries: product.countries,
  category_tags: product.category_tags,
  nutrition: product.nutrition,
  scores: product.scores,
  dietCompatibility,
});

export const toProductPreview = (
  product: NormalizedProduct,
  productId: string,
): ProductPreview => ({
  productId,
  barcode: product.code,
  product_name: product.product_name,
  brands: product.brands,
  image_url: product.image_url,
  nutriscore_grade: product.scores.nutriscore_grade,
});

export const toComparisonProductPreview = (
  product: NormalizedProduct,
  productId: string,
): ComparisonProductPreview => ({
  ...toProductPreview(product, productId),
  nutrition: {
    calories: product.nutrition.energy_kcal_100g,
    protein: product.nutrition.proteins_100g,
    fat: product.nutrition.fat_100g,
    sugars: product.nutrition.sugars_100g,
    fiber: product.nutrition.fiber_100g,
    salt: product.nutrition.salt_100g,
    saturatedFat: product.nutrition.saturated_fat_100g,
    nutriscore_grade: product.scores.nutriscore_grade,
  },
});
