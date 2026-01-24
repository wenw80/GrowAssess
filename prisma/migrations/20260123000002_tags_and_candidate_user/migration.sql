-- AlterTable: Add tags column to Test
ALTER TABLE "Test" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing category data to tags (split by comma and trim whitespace)
UPDATE "Test"
SET "tags" = CASE
  WHEN "category" IS NOT NULL AND "category" != '' THEN
    string_to_array(
      regexp_replace("category", '\s*,\s*', ',', 'g'),
      ','
    )
  ELSE ARRAY[]::TEXT[]
END;

-- Drop the old category column
ALTER TABLE "Test" DROP COLUMN "category";

-- AlterTable: Add userId to Candidate
ALTER TABLE "Candidate" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "Candidate_userId_idx" ON "Candidate"("userId");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
