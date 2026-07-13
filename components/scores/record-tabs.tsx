"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { BulkScoreForm } from "@/components/scores/bulk-score-form";
import { BulkScoreGridForm } from "@/components/scores/bulk-score-grid-form";

type Topic = { id: string; name: string; defaultMaxScore: number };
type Subject = { id: string; name: string; topics: Topic[] };
type Student = { id: string; firstName: string; lastName: string; serialNumber: string };

const MODES = [
  { value: "subject", label: "By subject", description: "Pick the subject and topic once, then enter each student's score in one pass." },
  { value: "grid", label: "Grid", description: "Pick subjects and students, then fill in scores directly in the table — spreadsheet style." },
] as const;

type Mode = (typeof MODES)[number]["value"];

export function RecordTabs({ subjects, students }: { subjects: Subject[]; students: Student[] }) {
  const [mode, setMode] = useState<Mode>("subject");
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

      {mode === "subject" ? (
        <BulkScoreForm subjects={subjects} students={students} />
      ) : (
        <BulkScoreGridForm subjects={subjects} students={students} />
      )}
    </div>
  );
}
