-- CreateTable
CREATE TABLE "product_ingredient_cache" (
    "id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "profile_hash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_ingredient_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_ingredient_cache_barcode_profile_hash_key" ON "product_ingredient_cache"("barcode", "profile_hash");
