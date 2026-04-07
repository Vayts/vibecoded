-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mainGoal" "MainGoal",
    "restrictions" "Restriction"[] DEFAULT ARRAY[]::"Restriction"[],
    "allergies" "Allergy"[] DEFAULT ARRAY[]::"Allergy"[],
    "otherAllergiesText" TEXT,
    "nutritionPriorities" "NutritionPriority"[] DEFAULT ARRAY[]::"NutritionPriority"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "family_members_userId_idx" ON "family_members"("userId");

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
