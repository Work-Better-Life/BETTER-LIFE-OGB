"use client";

import { useState } from "react";
import { TrendGraph } from "@/components/students/trend-graph";
import { SubjectComparison } from "@/components/students/subject-comparison";
import { StudentRangeSelect } from "@/components/students/student-range-select";
import { Button } from "@/components/ui/button";
import type { TrendGraphPoint } from "@/lib/trend-points";
import type { StudentOverviewRange } from "@/lib/trend-ranges";

type ComparisonSubject = {
  id: string;
  name: string;
  entries: { value: number; maxScore: number; recordedAt: Date }[];
};

export function StudentOverview({
  studentId,
  studentFirstName,
  range,
  points,
  subjects,
}: {
  studentId: string;
  studentFirstName: string;
  range: StudentOverviewRange;
  points: TrendGraphPoint[];
  subjects: ComparisonSubject[];
}) {
  const [view, setView] = useState<"trend" | "compare">("trend");

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-lg text-foreground">
          {view === "trend" ? "Performance over time" : "Compare subjects"}
        </h2>
        <div className="flex items-center gap-2">
          <StudentRangeSelect studentId={studentId} value={range} />
          {subjects.length > 1 && (
            <Button variant="secondary" size="sm" onClick={() => setView((v) => (v === "trend" ? "compare" : "trend"))}>
              {view === "trend" ? "Compare subjects" : "Back to trend"}
            </Button>
          )}
        </div>
      </div>

      {points.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-muted">
          {range === "all"
            ? `No scores recorded yet. Add the first score to start tracking ${studentFirstName}'s progress.`
            : "No scores recorded in this range. Try a wider time range."}
        </p>
      ) : view === "trend" ? (
        <TrendGraph studentId={studentId} points={points} />
      ) : (
        <SubjectComparison subjects={subjects} />
      )}
    </div>
  );
}
