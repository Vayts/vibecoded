-- CreateEnum
CREATE TYPE "DietType" AS ENUM ('NONE', 'KETO', 'VEGAN', 'VEGETARIAN', 'PALEO', 'LOW_CARB', 'GLUTEN_FREE', 'DAIRY_FREE');

-- CreateEnum
CREATE TYPE "MainGoal" AS ENUM ('GENERAL_HEALTH', 'WEIGHT_LOSS', 'DIABETES_CONTROL', 'PREGNANCY', 'MUSCLE_GAIN');

-- CreateEnum
CREATE TYPE "Restriction" AS ENUM ('VEGAN', 'VEGETARIAN', 'KETO', 'PALEO', 'GLUTEN_FREE', 'DAIRY_FREE', 'HALAL', 'KOSHER', 'NUT_FREE');

-- CreateEnum
CREATE TYPE "Allergy" AS ENUM ('PEANUTS', 'TREE_NUTS', 'GLUTEN', 'DAIRY', 'SOY', 'EGGS', 'SHELLFISH', 'SESAME', 'OTHER');

-- CreateEnum
CREATE TYPE "NutritionPriority" AS ENUM ('HIGH_PROTEIN', 'LOW_SUGAR', 'LOW_SODIUM', 'LOW_CARB', 'HIGH_FIBER');

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dietType" "DietType",
    "mainGoal" "MainGoal",
    "restrictions" "Restriction"[] DEFAULT ARRAY[]::"Restriction"[],
    "allergies" "Allergy"[] DEFAULT ARRAY[]::"Allergy"[],
    "otherAllergiesText" TEXT,
    "nutritionPriorities" "NutritionPriority"[] DEFAULT ARRAY[]::"NutritionPriority"[],
    "calorieGoal" INTEGER,
    "proteinGoal" INTEGER,
    "carbGoal" INTEGER,
    "fatGoal" INTEGER,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill new fields from the legacy dietType value.
UPDATE "user_profiles" SET "restrictions" = array_append("restrictions", 'VEGAN'::"Restriction") WHERE "dietType" = 'VEGAN';
UPDATE "user_profiles" SET "restrictions" = array_append("restrictions", 'VEGETARIAN'::"Restriction") WHERE "dietType" = 'VEGETARIAN';
UPDATE "user_profiles" SET "restrictions" = array_append("restrictions", 'KETO'::"Restriction") WHERE "dietType" = 'KETO';
UPDATE "user_profiles" SET "restrictions" = array_append("restrictions", 'PALEO'::"Restriction") WHERE "dietType" = 'PALEO';
UPDATE "user_profiles" SET "restrictions" = array_append("restrictions", 'GLUTEN_FREE'::"Restriction") WHERE "dietType" = 'GLUTEN_FREE';
UPDATE "user_profiles" SET "restrictions" = array_append("restrictions", 'DAIRY_FREE'::"Restriction") WHERE "dietType" = 'DAIRY_FREE';
UPDATE "user_profiles"
SET "nutritionPriorities" = array_append("nutritionPriorities", 'LOW_CARB'::"NutritionPriority")
WHERE "dietType" = 'LOW_CARB' AND NOT ('LOW_CARB'::"NutritionPriority" = ANY("nutritionPriorities"));
