-- AlterTable
ALTER TABLE "ScoreImport" ADD COLUMN "fileHash" TEXT;
ALTER TABLE "ScoreImport" ADD COLUMN "kind" TEXT;

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "daysAttended" INTEGER NOT NULL,
    "importBatchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ScoreImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Attendance_importBatchId_idx" ON "Attendance"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_weekStart_key" ON "Attendance"("studentId", "weekStart");

-- CreateIndex
CREATE INDEX "ScoreImport_fileHash_idx" ON "ScoreImport"("fileHash");
