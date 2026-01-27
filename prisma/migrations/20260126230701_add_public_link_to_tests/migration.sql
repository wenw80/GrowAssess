-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "publicLink" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Test_publicLink_key" ON "Test"("publicLink");

-- CreateIndex
CREATE INDEX "Test_publicLink_idx" ON "Test"("publicLink");
