-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_name_key" ON "Cohort"("name");

-- AlterTable
-- Hand-written on purpose. Prisma generated a full rebuild of "Student" here
-- (DROP TABLE + rename), which is unsafe for a populated table that scores and
-- profiles reference. Adding a nullable column in place leaves every existing
-- row exactly as it is.
ALTER TABLE "Student" ADD COLUMN "cohortId" TEXT REFERENCES "Cohort" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
