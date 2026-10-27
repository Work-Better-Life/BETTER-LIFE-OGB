-- Makes "university" and "course" optional and adds "importBatchId" to StudentProfile,
-- and adds "kind" to StudentImport.
--
-- StudentImport only gets a plain ADD COLUMN (no rebuild), because Student rows
-- point at it. StudentProfile has to be rebuilt (SQLite can't make a column
-- optional in place). That's safe here: nothing references StudentProfile, and the
-- INSERT ... SELECT below copies every existing row across unchanged.
-- AlterTable
ALTER TABLE "StudentImport" ADD COLUMN "kind" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StudentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "houseAddress" TEXT,
    "schoolName" TEXT NOT NULL,
    "schoolAddress" TEXT NOT NULL,
    "currentClass" TEXT NOT NULL,
    "coreSubjects" TEXT NOT NULL,
    "strugglingSubjects" TEXT NOT NULL,
    "hasTakenCbt" BOOLEAN NOT NULL,
    "computerComfort" INTEGER NOT NULL,
    "jambYear" INTEGER NOT NULL,
    "jambTargetScore" TEXT NOT NULL,
    "attendedExtraLessons" BOOLEAN NOT NULL,
    "biggestChallenge" TEXT,
    "strictCbtWilling" BOOLEAN NOT NULL,
    "followUpWilling" BOOLEAN,
    "mocksCommitment" BOOLEAN NOT NULL,
    "motivation" TEXT NOT NULL,
    "guardianName" TEXT NOT NULL,
    "guardianAddress" TEXT NOT NULL,
    "guardianPhone" TEXT NOT NULL,
    "guardianEmail" TEXT,
    "guardianSupports" BOOLEAN NOT NULL,
    "dataConsent" BOOLEAN NOT NULL,
    "additionalInfo" TEXT,
    "university" TEXT,
    "course" TEXT,
    "status" TEXT NOT NULL DEFAULT 'admitted',
    "dateJoined" DATETIME NOT NULL,
    "importBatchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentProfile_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentProfile_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "StudentImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StudentProfile" ("additionalInfo", "attendedExtraLessons", "biggestChallenge", "computerComfort", "coreSubjects", "course", "createdAt", "currentClass", "dataConsent", "dateJoined", "dateOfBirth", "followUpWilling", "gender", "guardianAddress", "guardianEmail", "guardianName", "guardianPhone", "guardianSupports", "hasTakenCbt", "houseAddress", "id", "jambTargetScore", "jambYear", "mocksCommitment", "motivation", "schoolAddress", "schoolName", "status", "strictCbtWilling", "strugglingSubjects", "studentId", "university", "updatedAt") SELECT "additionalInfo", "attendedExtraLessons", "biggestChallenge", "computerComfort", "coreSubjects", "course", "createdAt", "currentClass", "dataConsent", "dateJoined", "dateOfBirth", "followUpWilling", "gender", "guardianAddress", "guardianEmail", "guardianName", "guardianPhone", "guardianSupports", "hasTakenCbt", "houseAddress", "id", "jambTargetScore", "jambYear", "mocksCommitment", "motivation", "schoolAddress", "schoolName", "status", "strictCbtWilling", "strugglingSubjects", "studentId", "university", "updatedAt" FROM "StudentProfile";
DROP TABLE "StudentProfile";
ALTER TABLE "new_StudentProfile" RENAME TO "StudentProfile";
CREATE UNIQUE INDEX "StudentProfile_studentId_key" ON "StudentProfile"("studentId");
CREATE INDEX "StudentProfile_importBatchId_idx" ON "StudentProfile"("importBatchId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
