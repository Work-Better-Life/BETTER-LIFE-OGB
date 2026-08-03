"use client";

import { useState } from "react";
import { TrendGraph } from "@/components/students/trend-graph";
import { SubjectComparison } from "@/components/students/subject-comparison";
import { Button } from "@/components/ui/button";
import type { TrendGraphPoint } from "@/lib/trend-points";

type ComparisonSubject = {
  id: string;
  name: string;
  entries: { value: number; maxScore: number; recordedAt: Date }[];
};

export function StudentOverview({
  studentId,
  points,
  subjects,
}: {
  studentId: string;
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
        {subjects.length > 1 && (
          <Button variant="secondary" size="sm" onClick={() => setView((v) => (v === "trend" ? "compare" : "trend"))}>
            {view === "trend" ? "Compare subjects" : "Back to trend"}
          </Button>
        )}
      </div>

      {view === "trend" ? (
        <TrendGraph studentId={studentId} points={points} />
      ) : (
        <SubjectComparison subjects={subjects} />
      )}
    </div>
  );
}
