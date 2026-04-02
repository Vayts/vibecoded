-- CreateEnum
CREATE TYPE "ScanSource" AS ENUM ('barcode', 'photo');

-- CreateEnum
CREATE TYPE "PersonalAnalysisStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateTable
CREATE TABLE "scans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "barcode" TEXT,
    "source" "ScanSource" NOT NULL,
    "overallScore" INTEGER,
    "overallRating" TEXT,
    "personalAnalysisStatus" "PersonalAnalysisStatus",
    "personalAnalysisJobId" TEXT,
    "evaluation" JSONB,
    "personalResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scans_userId_createdAt_idx" ON "scans"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
