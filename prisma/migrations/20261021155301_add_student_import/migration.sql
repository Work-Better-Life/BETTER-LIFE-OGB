-- CreateTable
CREATE TABLE "StudentImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT,
    "cohortName" TEXT,
    "studentCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AlterTable
-- Hand-written on purpose. Prisma generated a full rebuild of "Student"
-- (DROP TABLE + rename), which is unsafe for the table every score and profile
-- depends on. Adding a nullable column in place leaves every existing row untouched.
ALTER TABLE "Student" ADD COLUMN "importBatchId" TEXT REFERENCES "StudentImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Student_importBatchId_idx" ON "Student"("importBatchId");
