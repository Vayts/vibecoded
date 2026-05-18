ALTER TABLE "products"
ADD COLUMN "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "is_ai_checked" BOOLEAN NOT NULL DEFAULT false;

