-- AlterTable
-- Add testSnapshot column - will be populated via backfill script
ALTER TABLE "TestAssignment" ADD COLUMN "testSnapshot" TEXT NOT NULL DEFAULT '{}';

-- Remove default after adding the column (we'll require it for new records)
ALTER TABLE "TestAssignment" ALTER COLUMN "testSnapshot" DROP DEFAULT;
