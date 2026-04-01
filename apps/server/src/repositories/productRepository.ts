import { normalizedProductSchema, type NormalizedProduct } from '@acme/shared';
import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { syncProductEmbedding } from '../services/product-embedding.service';

const toNormalizedProduct = (product: {
  code: string;
  product_name: string | null;
  brands: string | null;
  image_url: string | null;
  ingredients_text: string | null;
  nutriscore_grade: string | null;
  categories: string | null;
  quantity: string | null;
  serving_size: string | null;
  ingredients: string[];
  allergens: string[];
  additives: string[];
  additives_count: number | null;
  traces: string[];
  countries: string[];
  category_tags: string[];
  images: Prisma.JsonValue;
  nutrition: Prisma.JsonValue;
  scores: Prisma.JsonValue;
}): NormalizedProduct => {
  return normalizedProductSchema.parse({
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
    images: product.images,
    nutrition: product.nutrition,
    scores: product.scores,
  });
};

const toProductCreateInput = (product: NormalizedProduct): Prisma.ProductUncheckedCreateInput => {
  return {
    barcode: product.code,
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
    images: product.images as Prisma.InputJsonValue,
    nutrition: product.nutrition as Prisma.InputJsonValue,
    scores: product.scores as Prisma.InputJsonValue,
  };
};

export const findByBarcode = async (barcode: string): Promise<NormalizedProduct | null> => {
  const product = await prisma.product.findUnique({
    where: { barcode },
  });

  if (!product) {
    return null;
  }

  return toNormalizedProduct(product);
};

export const findByNameAndBrand = async (
  productName: string,
  brand: string,
): Promise<NormalizedProduct | null> => {
  const product = await prisma.product.findFirst({
    where: {
      product_name: { equals: productName, mode: 'insensitive' },
      brands: { equals: brand, mode: 'insensitive' },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!product) return null;
  return toNormalizedProduct(product);
};

export const createProduct = async (product: NormalizedProduct): Promise<NormalizedProduct> => {
  const startedAt = Date.now();
  console.log(
    `[productRepository] upsert start code=${product.code} name="${product.product_name ?? ''}" brand="${product.brands ?? ''}" imageUrl="${product.image_url ?? ''}"`,
  );
  const data = toProductCreateInput(product);
  const savedProduct = await prisma.product.upsert({
    where: { barcode: product.code },
    create: data,
    update: data,
  });

  console.log(
    `[productRepository] upsert done id=${savedProduct.id} code=${savedProduct.code} elapsed=${Date.now() - startedAt}ms`,
  );

  try {
    await syncProductEmbedding(savedProduct.id, savedProduct.product_name, savedProduct.brands);
    console.log(
      `[productRepository] embedding synced id=${savedProduct.id} code=${savedProduct.code} totalElapsed=${Date.now() - startedAt}ms`,
    );
  } catch (error) {
    console.error(
      '[productRepository] Failed to sync product embedding:',
      error instanceof Error ? error.message : error,
    );
  }

  return toNormalizedProduct(savedProduct);
};