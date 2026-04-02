-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "product_name" TEXT,
    "brands" TEXT,
    "image_url" TEXT,
    "ingredients_text" TEXT,
    "nutriscore_grade" TEXT,
    "categories" TEXT,
    "quantity" TEXT,
    "serving_size" TEXT,
    "ingredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "additives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "additives_count" INTEGER,
    "traces" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "images" JSONB NOT NULL,
    "nutrition" JSONB NOT NULL,
    "scores" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");
