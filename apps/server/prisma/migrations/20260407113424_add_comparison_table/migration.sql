-- CreateTable
CREATE TABLE "comparisons" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "product1Id" TEXT,
    "product2Id" TEXT,
    "barcode1" TEXT NOT NULL,
    "barcode2" TEXT NOT NULL,
    "comparisonResult" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comparisons_userId_createdAt_idx" ON "comparisons"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_product1Id_fkey" FOREIGN KEY ("product1Id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_product2Id_fkey" FOREIGN KEY ("product2Id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate existing comparison scans to the new comparisons table
INSERT INTO "comparisons" ("id", "userId", "product1Id", "product2Id", "barcode1", "barcode2", "comparisonResult", "createdAt")
SELECT
  "id",
  "userId",
  "productId",
  "product2Id",
  COALESCE(split_part("barcode", '|', 1), ''),
  COALESCE(split_part("barcode", '|', 2), ''),
  COALESCE("comparisonResult", '{}'),
  "createdAt"
FROM "scans"
WHERE "type" = 'comparison';

-- Remove migrated comparison scans from scans table
DELETE FROM "scans" WHERE "type" = 'comparison';
