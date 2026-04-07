/*
  Warnings:

  - You are about to drop the `cards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `decks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `generation_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `review_logs` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[revenuecatAppUserId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "cards" DROP CONSTRAINT "cards_deckId_fkey";

-- DropForeignKey
ALTER TABLE "decks" DROP CONSTRAINT "decks_userId_fkey";

-- DropForeignKey
ALTER TABLE "generation_logs" DROP CONSTRAINT "generation_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "review_logs" DROP CONSTRAINT "review_logs_cardId_fkey";

-- DropForeignKey
ALTER TABLE "review_logs" DROP CONSTRAINT "review_logs_userId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "freeGenerationsBalance" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "lastMonthlyTopUp" TIMESTAMP(3),
ADD COLUMN     "revenuecatAppUserId" TEXT,
ADD COLUMN     "subscriptionExpiry" TIMESTAMP(3),
ADD COLUMN     "subscriptionPlan" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT;

-- DropTable
DROP TABLE "cards";

-- DropTable
DROP TABLE "decks";

-- DropTable
DROP TABLE "generation_logs";

-- DropTable
DROP TABLE "review_logs";

-- CreateIndex
CREATE UNIQUE INDEX "users_revenuecatAppUserId_key" ON "users"("revenuecatAppUserId");
