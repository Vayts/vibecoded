CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "products"
ADD COLUMN "embeddingText" TEXT,
ADD COLUMN "embeddingVector" vector(1536);

CREATE INDEX "products_embeddingVector_idx"
ON "products"
USING ivfflat ("embeddingVector" vector_cosine_ops)
WITH (lists = 100);