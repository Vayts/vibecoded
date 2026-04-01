import dotenv from 'dotenv';
import { prisma } from '../lib/prisma';
import { buildCanonicalProductText } from '../services/product-canonical-text';
import { syncProductEmbedding } from '../services/product-embedding.service';

dotenv.config();

const DEFAULT_BATCH_SIZE = 50;

const batchSize = Number.parseInt(
  process.env.PRODUCT_EMBEDDING_BACKFILL_BATCH_SIZE ?? `${DEFAULT_BATCH_SIZE}`,
  10,
);
const force = process.argv.includes('--force');

const main = async (): Promise<void> => {
  const startedAt = Date.now();
  console.log(
    `[ProductEmbeddingBackfill] start batchSize=${batchSize > 0 ? batchSize : DEFAULT_BATCH_SIZE} force=${force}`,
  );
  let cursor: string | undefined;
  let processed = 0;
  let updated = 0;
  let skipped = 0;

  for (;;) {
    const products = await prisma.product.findMany({
      orderBy: { id: 'asc' },
      take: batchSize > 0 ? batchSize : DEFAULT_BATCH_SIZE,
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
      select: {
        id: true,
        code: true,
        product_name: true,
        brands: true,
        embeddingText: true,
      },
    });

    if (products.length === 0) {
      break;
    }

    console.log(
      `[ProductEmbeddingBackfill] batch cursor=${cursor ?? 'start'} size=${products.length} processed=${processed} updated=${updated} skipped=${skipped}`,
    );

    for (const product of products) {
      processed += 1;

      const canonicalText = buildCanonicalProductText({
        productName: product.product_name,
        brand: product.brands,
      });

      if (!canonicalText) {
        skipped += 1;
        console.log(`[ProductEmbeddingBackfill] skip ${product.code} reason=empty-canonical-text`);
        continue;
      }

      if (!force && product.embeddingText === canonicalText) {
        skipped += 1;
        console.log(`[ProductEmbeddingBackfill] skip ${product.code} reason=up-to-date text="${canonicalText}"`);
        continue;
      }

      await syncProductEmbedding(product.id, product.product_name, product.brands);
      updated += 1;
      console.log(`[ProductEmbeddingBackfill] updated ${product.code} -> ${canonicalText}`);
    }

    cursor = products[products.length - 1]?.id;
  }

  console.log(
    `[ProductEmbeddingBackfill] completed processed=${processed} updated=${updated} skipped=${skipped} elapsed=${Date.now() - startedAt}ms`,
  );
};

main()
  .catch((error) => {
    console.error('[ProductEmbeddingBackfill] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });