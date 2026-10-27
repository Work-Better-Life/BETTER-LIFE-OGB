"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { BulkScoreForm } from "@/components/scores/bulk-score-form";
import { BulkScoreGridForm } from "@/components/scores/bulk-score-grid-form";
import { ImportScoresForm } from "@/components/scores/import-scores-form";
import { ImportAttendanceForm } from "@/components/scores/import-attendance-form";
import { RecentImports } from "@/components/scores/recent-imports";

type Topic = { id: string; name: string; defaultMaxScore: number };
type Subject = { id: string; name: string; topics: Topic[] };
type Student = { id: string; firstName: string; lastName: string; serialNumber: string; cohortId: string | null };
type CohortOption = { id: string; name: string };
type ScoreImportRow = {
  id: string;
  testName: string;
  fileName: string | null;
  cohortName: string | null;
  recordedAt: string;
  createdAt: string;
  entryCount: number;
  remaining: number;
  kind: "scores" | "attendance";
  attendanceRecords: number;
};

const MODES = [
  { value: "subject", label: "By subject", description: "Pick the subject and topic once, then enter each student's score in one pass." },
  { value: "grid", label: "Grid", description: "Pick subjects and students, then fill in scores directly in the table — spreadsheet style." },
  {
    value: "import",
    label: "Import file",
    description: "Upload a spreadsheet of scores (Excel, OpenDocument or CSV). Everything is checked first, and nothing is saved until the file has no problems.",
  },
  {
    value: "attendance",
    label: "Import attendance",
    description: "Upload attendance only (days attended out of 5 each week), for weeks that were recorded before attendance existed.",
  },
] as const;

type Mode = (typeof MODES)[number]["value"];

export function RecordTabs({
  subjects,
  students,
  cohorts,
  imports,
}: {
  subjects: Subject[];
  students: Student[];
  cohorts: CohortOption[];
  imports: ScoreImportRow[];
}) {
  const [mode, setMode] = useState<Mode>("subject");
  const [cohort, setCohort] = useState("");
  const shownStudents =
    cohort === "" ? students : students.filter((s) => (cohort === "none" ? s.cohortId === null : s.cohortId === cohort));
  const active = MODES.find((m) => m.value === mode)!;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex w-fit gap-0.5 rounded-md border border-border bg-surface-muted p-0.5" role="group" aria-label="Record mode">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              aria-pressed={mode === m.value}
              className={cn(
                "rounded-[5px] px-3 py-1.5 text-sm font-medium transition-colors",
                mode === m.value ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-foreground-muted">{active.description}</p>
      </div>

      {mode !== "import" && cohorts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="recordCohort" className="text-sm font-medium text-foreground">
            Show students from
          </label>
          <select
            id="recordCohort"
            value={cohort}
            onChange={(e) => setCohort(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground"
          >
            <option value="">All cohorts</option>
            <option value="none">No cohort</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="text-sm text-foreground-muted">{shownStudents.length} students</span>
        </div>
      )}

      {/* Keyed by cohort so changing the filter starts the form fresh — otherwise
          students ticked under one cohort would stay selected, unseen, under another. */}
      {mode === "subject" && <BulkScoreForm key={cohort} subjects={subjects} students={shownStudents} />}
      {mode === "grid" && <BulkScoreGridForm key={cohort} subjects={subjects} students={shownStudents} />}
      {mode === "import" && (
        <>
          <ImportScoresForm cohorts={cohorts} />
          <RecentImports imports={imports} />
        </>
      )}
      {mode === "attendance" && (
        <>
          <ImportAttendanceForm cohorts={cohorts} />
          <RecentImports imports={imports} />
        </>
      )}
    </div>
  );
}
