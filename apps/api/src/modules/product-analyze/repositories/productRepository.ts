import { normalizedProductSchema, type NormalizedProduct } from '@acme/shared';
import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import {
  hasSameCanonicalProductIdentity,
  sanitizeProductText,
  sanitizeNormalizedProductTextFields,
} from '../services/product-canonical-text';
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
  return sanitizeNormalizedProductTextFields(normalizedProductSchema.parse({
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
  }));
};

const toProductCreateInput = (
  product: NormalizedProduct,
): Prisma.ProductUncheckedCreateInput => {
  const sanitizedProduct = sanitizeNormalizedProductTextFields(product);

  return {
    barcode: sanitizedProduct.code,
    code: sanitizedProduct.code,
    product_name: sanitizedProduct.product_name,
    brands: sanitizedProduct.brands,
    image_url: sanitizedProduct.image_url,
    ingredients_text: sanitizedProduct.ingredients_text,
    nutriscore_grade: sanitizedProduct.nutriscore_grade,
    categories: sanitizedProduct.categories,
    quantity: sanitizedProduct.quantity,
    serving_size: sanitizedProduct.serving_size,
    ingredients: sanitizedProduct.ingredients,
    allergens: sanitizedProduct.allergens,
    additives: sanitizedProduct.additives,
    additives_count: sanitizedProduct.additives_count,
    traces: sanitizedProduct.traces,
    countries: sanitizedProduct.countries,
    category_tags: sanitizedProduct.category_tags,
    images: sanitizedProduct.images as Prisma.InputJsonValue,
    nutrition: sanitizedProduct.nutrition as Prisma.InputJsonValue,
    scores: sanitizedProduct.scores as Prisma.InputJsonValue,
  };
};

const needsSanitizedTextRepair = (
  rawProduct: {
    product_name: string | null;
    brands: string | null;
    ingredients_text: string | null;
    nutriscore_grade: string | null;
    categories: string | null;
    quantity: string | null;
    serving_size: string | null;
    ingredients: string[];
    allergens: string[];
    additives: string[];
    traces: string[];
    countries: string[];
    category_tags: string[];
  },
  product: NormalizedProduct,
): boolean => {
  return (
    rawProduct.product_name !== product.product_name ||
    rawProduct.brands !== product.brands ||
    rawProduct.ingredients_text !== product.ingredients_text ||
    rawProduct.nutriscore_grade !== product.nutriscore_grade ||
    rawProduct.categories !== product.categories ||
    rawProduct.quantity !== product.quantity ||
    rawProduct.serving_size !== product.serving_size ||
    JSON.stringify(rawProduct.ingredients) !== JSON.stringify(product.ingredients) ||
    JSON.stringify(rawProduct.allergens) !== JSON.stringify(product.allergens) ||
    JSON.stringify(rawProduct.additives) !== JSON.stringify(product.additives) ||
    JSON.stringify(rawProduct.traces) !== JSON.stringify(product.traces) ||
    JSON.stringify(rawProduct.countries) !== JSON.stringify(product.countries) ||
    JSON.stringify(rawProduct.category_tags) !== JSON.stringify(product.category_tags)
  );
};

export const findByBarcode = async (
  barcode: string,
): Promise<NormalizedProduct | null> => {
  const product = await prisma.product.findUnique({
    where: { barcode },
  });

  if (!product) {
    console.log(
      `[productRepository] No product found in DB for barcode=${barcode}`,
    );

    return null;
  }

  console.log(
    `[productRepository] Found product in DB for barcode=${barcode} name="${product.product_name ?? ''}" brand="${product.brands ?? ''}" imageUrl="${product.image_url ?? ''}"`,
  );

  const normalizedProduct = toNormalizedProduct(product);

  if (needsSanitizedTextRepair(product, normalizedProduct)) {
    console.log(
      `[productRepository] repairing sanitized text fields for barcode=${barcode}`,
    );
    return createProduct(normalizedProduct);
  }

  return normalizedProduct;
};

export const findByCanonicalProductText = async (
  productName?: string | null,
  brand?: string | null,
): Promise<NormalizedProduct | null> => {
  const sanitizedProductName = sanitizeProductText(productName);
  const sanitizedBrand = sanitizeProductText(brand);

  if (!sanitizedProductName && !sanitizedBrand) {
    return null;
  }

  const candidates = await prisma.product.findMany({
    where: sanitizedProductName
      ? {
          product_name: {
            equals: sanitizedProductName,
            mode: 'insensitive',
          },
        }
      : {
          brands: {
            equals: sanitizedBrand,
            mode: 'insensitive',
          },
        },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });

  const matchingProduct = candidates.find((candidate) =>
    hasSameCanonicalProductIdentity(
      {
        productName,
        brand,
      },
      {
        productName: candidate.product_name,
        brand: candidate.brands,
        quantity: candidate.quantity,
      },
    ),
  );

  if (!matchingProduct) {
    console.log(
      `[productRepository] No product found in DB for canonical identity productName="${sanitizedProductName ?? ''}" brand="${sanitizedBrand ?? ''}"`,
    );

    return null;
  }

  console.log(
    `[productRepository] Found product in DB for canonical identity code=${matchingProduct.code} name="${matchingProduct.product_name ?? ''}" brand="${matchingProduct.brands ?? ''}"`,
  );

  const normalizedProduct = toNormalizedProduct(matchingProduct);

  if (needsSanitizedTextRepair(matchingProduct, normalizedProduct)) {
    console.log(
      `[productRepository] repairing sanitized text fields for canonical identity code=${matchingProduct.code}`,
    );
    return createProduct(normalizedProduct);
  }

  return normalizedProduct;
};

export const createProduct = async (
  product: NormalizedProduct,
): Promise<NormalizedProduct> => {
  const sanitizedProduct = sanitizeNormalizedProductTextFields(product);
  const startedAt = Date.now();
  console.log(
    `[productRepository] upsert start code=${sanitizedProduct.code} name="${sanitizedProduct.product_name ?? ''}" brand="${sanitizedProduct.brands ?? ''}" imageUrl="${sanitizedProduct.image_url ?? ''}"`,
  );
  const data = toProductCreateInput(sanitizedProduct);

  const existing = await prisma.product.findUnique({
    where: { barcode: sanitizedProduct.code },
    select: { id: true, embeddingText: true, product_name: true, brands: true },
  });

  const savedProduct = await prisma.product.upsert({
    where: { barcode: sanitizedProduct.code },
    create: data,
    update: data,
  });

  console.log(
    `[productRepository] upsert done id=${savedProduct.id} code=${savedProduct.code} elapsed=${Date.now() - startedAt}ms`,
  );

  const nameChanged =
    !existing ||
    existing.product_name !== savedProduct.product_name ||
    existing.brands !== savedProduct.brands;
  const hasEmbedding = !!existing?.embeddingText;

  if (!hasEmbedding || nameChanged) {
    void syncProductEmbedding(
      savedProduct.id,
      savedProduct.product_name,
      savedProduct.brands,
    )
      .then(() => {
        console.log(
          `[productRepository] embedding synced id=${savedProduct.id} code=${savedProduct.code} totalElapsed=${Date.now() - startedAt}ms`,
        );
      })
      .catch((error) => {
        console.error(
          '[productRepository] Failed to sync product embedding:',
          error instanceof Error ? error.message : error,
        );
      });
  } else {
    console.log(
      `[productRepository] embedding skip (unchanged) id=${savedProduct.id} code=${savedProduct.code}`,
    );
  }

  return toNormalizedProduct(savedProduct);
};
