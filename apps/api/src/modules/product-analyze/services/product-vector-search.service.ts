import { normalizedProductSchema, type NormalizedProduct } from '@acme/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { buildCanonicalProductText } from './product-canonical-text';
import { generateEmbeddingForText } from './product-embedding.service';
import { withCanonicalProductImage } from '../../../shared/utils/product-image';

interface FindVectorMatchInput {
  productName?: string | null;
  brand?: string | null;
}

interface ProductVectorRow {
  id: string;
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
  similarity: number;
}

const DEFAULT_SIMILARITY_THRESHOLD = 0.75;
const DEFAULT_TOP_K = 5;

const getSimilarityThreshold = (): number => {
  const value = Number(process.env.PRODUCT_VECTOR_MATCH_THRESHOLD ?? DEFAULT_SIMILARITY_THRESHOLD);
  return Number.isFinite(value) ? value : DEFAULT_SIMILARITY_THRESHOLD;
};

const getTopK = (): number => {
  const value = Number.parseInt(process.env.PRODUCT_VECTOR_MATCH_TOP_K ?? `${DEFAULT_TOP_K}`, 10);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TOP_K;
};

const toVectorSql = (embedding: number[]): Prisma.Sql => {
  const values = embedding
    .map((value) => {
      if (!Number.isFinite(value)) {
        throw new Error('Embedding contains a non-finite value');
      }

      return Number(value.toFixed(8));
    })
    .join(',');

  return Prisma.raw(`'[${values}]'::vector`);
};

const toNormalizedProduct = (row: ProductVectorRow): NormalizedProduct | null => {
  const parsed = normalizedProductSchema.safeParse({
    code: row.code,
    product_name: row.product_name,
    brands: row.brands,
    image_url: row.image_url,
    ingredients_text: row.ingredients_text,
    nutriscore_grade: row.nutriscore_grade,
    categories: row.categories,
    quantity: row.quantity,
    serving_size: row.serving_size,
    ingredients: row.ingredients,
    allergens: row.allergens,
    additives: row.additives,
    additives_count: row.additives_count,
    traces: row.traces,
    countries: row.countries,
    category_tags: row.category_tags,
    images: row.images,
    nutrition: row.nutrition,
    scores: row.scores,
  });

  return parsed.success ? withCanonicalProductImage(parsed.data) : null;
};

export const findBestVectorMatchedProduct = async (
  input: FindVectorMatchInput,
): Promise<{
  product: NormalizedProduct;
  similarity: number;
  queryText: string;
} | null> => {
  const startedAt = Date.now();
  const queryText = buildCanonicalProductText(input);

  if (!queryText) {
    console.log(
      `[product-vector-search] skip search because canonical query is empty productName="${input.productName ?? ''}" brand="${input.brand ?? ''}"`,
    );
    return null;
  }

  const threshold = getSimilarityThreshold();
  const topK = getTopK();
  console.log(
    `[product-vector-search] search start query="${queryText}" threshold=${threshold} topK=${topK}`,
  );

  const queryEmbedding = await generateEmbeddingForText(queryText);

  if (!queryEmbedding) {
    console.log(
      `[product-vector-search] skip search because embedding generation returned null query="${queryText}"`,
    );
    return null;
  }

  const vectorSql = toVectorSql(queryEmbedding);
  const candidates = await prisma.$queryRaw<ProductVectorRow[]>(
    Prisma.sql`
      SELECT
        p."id",
        p."code",
        p."product_name",
        p."brands",
        p."image_url",
        p."ingredients_text",
        p."nutriscore_grade",
        p."categories",
        p."quantity",
        p."serving_size",
        p."ingredients",
        p."allergens",
        p."additives",
        p."additives_count",
        p."traces",
        p."countries",
        p."category_tags",
        p."images",
        p."nutrition",
        p."scores",
        1 - (p."embeddingVector" <=> ${vectorSql}) AS similarity
      FROM "products" p
      WHERE p."embeddingVector" IS NOT NULL
      ORDER BY p."embeddingVector" <=> ${vectorSql}
      LIMIT ${topK}
    `,
  );

  const candidateSummary = candidates
    .map(
      (candidate, index) =>
        `${index + 1}:${candidate.code}:${Number(candidate.similarity).toFixed(3)}:${candidate.product_name ?? 'unknown'}:${candidate.brands ?? 'unknown'}`,
    )
    .join(' | ');
  console.log(
    `[product-vector-search] candidates count=${candidates.length} query="${queryText}" results=${candidateSummary || 'none'} elapsed=${Date.now() - startedAt}ms`,
  );

  const bestCandidate = candidates[0];

  if (!bestCandidate) {
    console.log(
      `[product-vector-search] no candidates query="${queryText}" elapsed=${Date.now() - startedAt}ms`,
    );
    return null;
  }

  if (Number(bestCandidate.similarity) < threshold) {
    console.log(
      `[product-vector-search] best candidate rejected query="${queryText}" code=${bestCandidate.code} similarity=${Number(bestCandidate.similarity).toFixed(3)} threshold=${threshold}`,
    );
    return null;
  }

  const product = toNormalizedProduct(bestCandidate);

  if (!product) {
    console.warn(
      `[product-vector-search] best candidate parse failed query="${queryText}" code=${bestCandidate.code} similarity=${Number(bestCandidate.similarity).toFixed(3)}`,
    );
    return null;
  }

  console.log(
    `[product-vector-search] match accepted query="${queryText}" code=${bestCandidate.code} similarity=${Number(bestCandidate.similarity).toFixed(3)} elapsed=${Date.now() - startedAt}ms`,
  );

  return {
    product,
    similarity: Number(bestCandidate.similarity),
    queryText,
  };
};
