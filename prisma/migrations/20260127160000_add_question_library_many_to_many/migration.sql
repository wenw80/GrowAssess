-- CreateTable: TestQuestion junction table for many-to-many relationship
CREATE TABLE "TestQuestion" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "TestQuestion_pkey" PRIMARY KEY ("id")
);

-- Add tags to Question
ALTER TABLE "Question" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Question" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Question" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Migrate existing data: Create TestQuestion records from existing Question.testId and Question.order
INSERT INTO "TestQuestion" ("id", "testId", "questionId", "order")
SELECT
    gen_random_uuid()::text,
    "testId",
    "id",
    "order"
FROM "Question";

-- Drop old foreign key constraint
ALTER TABLE "Question" DROP CONSTRAINT "Question_testId_fkey";

-- Remove old columns from Question
ALTER TABLE "Question" DROP COLUMN "testId";
ALTER TABLE "Question" DROP COLUMN "order";

-- CreateIndex
CREATE INDEX "Question_tags_idx" ON "Question"("tags");

CREATE UNIQUE INDEX "TestQuestion_testId_questionId_key" ON "TestQuestion"("testId", "questionId");

CREATE INDEX "TestQuestion_testId_idx" ON "TestQuestion"("testId");

CREATE INDEX "TestQuestion_questionId_idx" ON "TestQuestion"("questionId");

-- AddForeignKey
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
