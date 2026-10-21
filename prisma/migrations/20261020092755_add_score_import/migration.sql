-- CreateTable
CREATE TABLE "ScoreImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testName" TEXT NOT NULL,
    "fileName" TEXT,
    "cohortName" TEXT,
    "recordedAt" DATETIME NOT NULL,
    "entryCount" INTEGER NOT NULL,
    "createdTopicIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AlterTable
-- Hand-written on purpose. Prisma generated a full rebuild of "ScoreEntry"
-- (DROP TABLE + rename), which is unsafe for the table holding every score ever
-- recorded. Adding a nullable column in place leaves every existing row untouched.
ALTER TABLE "ScoreEntry" ADD COLUMN "importBatchId" TEXT REFERENCES "ScoreImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ScoreEntry_importBatchId_idx" ON "ScoreEntry"("importBatchId");
