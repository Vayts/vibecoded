import { OpenAIEmbeddings } from '@langchain/openai';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { buildCanonicalProductText } from './product-canonical-text';

const PRODUCT_EMBEDDING_MODEL = 'text-embedding-3-small';

const getEmbeddingsClient = (): OpenAIEmbeddings | null => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAIEmbeddings({
    apiKey,
    model: PRODUCT_EMBEDDING_MODEL,
  });
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

export const generateEmbeddingForText = async (
  text: string,
): Promise<number[] | null> => {
  const startedAt = Date.now();
  const embeddings = getEmbeddingsClient();

  if (!embeddings) {
    console.warn(
      '[product-embedding] skip generate embedding because OPENAI_API_KEY is missing',
    );
    return null;
  }

  console.log(
    `[product-embedding] generate start model=${PRODUCT_EMBEDDING_MODEL} textLength=${text.length} text="${text}"`,
  );
  const [vector] = await embeddings.embedDocuments([text]);
  console.log(
    `[product-embedding] generate done dims=${vector?.length ?? 0} elapsed=${Date.now() - startedAt}ms text="${text}"`,
  );
  return vector ?? null;
};

export const buildProductEmbeddingInput = async (
  productName?: string | null,
  brand?: string | null,
): Promise<{ embeddingText: string; embeddingVector: number[] } | null> => {
  const embeddingText = buildCanonicalProductText({ productName, brand });

  if (!embeddingText) {
    console.log(
      `[product-embedding] skip build embedding input because canonical text is empty productName="${productName ?? ''}" brand="${brand ?? ''}"`,
    );
    return null;
  }

  const embeddingVector = await generateEmbeddingForText(embeddingText);

  if (!embeddingVector) {
    return null;
  }

  return {
    embeddingText,
    embeddingVector,
  };
};

export const syncProductEmbedding = async (
  productId: string,
  productName?: string | null,
  brand?: string | null,
): Promise<void> => {
  const startedAt = Date.now();
  const embedding = await buildProductEmbeddingInput(productName, brand);

  if (!embedding) {
    console.log(
      `[product-embedding] skip sync productId=${productId} productName="${productName ?? ''}" brand="${brand ?? ''}"`,
    );
    return;
  }

  console.log(
    `[product-embedding] sync start productId=${productId} text="${embedding.embeddingText}" dims=${embedding.embeddingVector.length}`,
  );

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "products"
      SET
        "embeddingText" = ${embedding.embeddingText},
        "embeddingVector" = ${toVectorSql(embedding.embeddingVector)}
      WHERE "id" = ${productId}
    `,
  );

  console.log(
    `[product-embedding] sync done productId=${productId} elapsed=${Date.now() - startedAt}ms`,
  );
};
