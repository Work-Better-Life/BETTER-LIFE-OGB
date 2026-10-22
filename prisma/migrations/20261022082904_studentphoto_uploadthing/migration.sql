-- Safe to rebuild: "StudentPhoto" was introduced on this same unmerged branch
-- (production doesn't have it yet), nothing references it, and the INSERT ... SELECT
-- below carries over every existing row. Unlike "Student" or "ScoreEntry", this
-- table has no history to lose. Makes "data" optional and adds "url" / "key" for
-- UploadThing.
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StudentPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "data" TEXT,
    "url" TEXT,
    "key" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentPhoto_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StudentPhoto" ("data", "id", "studentId", "updatedAt") SELECT "data", "id", "studentId", "updatedAt" FROM "StudentPhoto";
DROP TABLE "StudentPhoto";
ALTER TABLE "new_StudentPhoto" RENAME TO "StudentPhoto";
CREATE UNIQUE INDEX "StudentPhoto_studentId_key" ON "StudentPhoto"("studentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
