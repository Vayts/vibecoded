UPDATE "user_profiles"
SET "allergies" = array_remove(array_remove("allergies", 'GLUTEN'::"Allergy"), 'DAIRY'::"Allergy");

UPDATE "family_members"
SET "allergies" = array_remove(array_remove("allergies", 'GLUTEN'::"Allergy"), 'DAIRY'::"Allergy");

DELETE FROM "comparisons";
DELETE FROM "scans";
DELETE FROM "product_ingredient_cache";

ALTER TYPE "Allergy" RENAME TO "Allergy_old";

CREATE TYPE "Allergy" AS ENUM (
  'PEANUTS',
  'TREE_NUTS',
  'SOY',
  'EGGS',
  'SHELLFISH',
  'SESAME',
  'OTHER'
);

ALTER TABLE "user_profiles"
ALTER COLUMN "allergies" DROP DEFAULT,
ALTER COLUMN "allergies" TYPE "Allergy"[]
USING ("allergies"::text[]::"Allergy"[]),
ALTER COLUMN "allergies" SET DEFAULT ARRAY[]::"Allergy"[];

ALTER TABLE "family_members"
ALTER COLUMN "allergies" DROP DEFAULT,
ALTER COLUMN "allergies" TYPE "Allergy"[]
USING ("allergies"::text[]::"Allergy"[]),
ALTER COLUMN "allergies" SET DEFAULT ARRAY[]::"Allergy"[];

DROP TYPE "Allergy_old";

UPDATE "users"
SET "analysis_preferences_updated_at" = NOW();
