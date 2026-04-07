-- CreateEnum
CREATE TYPE "ScanType" AS ENUM ('product', 'comparison');

-- AlterTable
ALTER TABLE "scans" ADD COLUMN     "comparisonResult" JSONB,
ADD COLUMN     "product2Id" TEXT,
ADD COLUMN     "type" "ScanType" NOT NULL DEFAULT 'product';

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_product2Id_fkey" FOREIGN KEY ("product2Id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
