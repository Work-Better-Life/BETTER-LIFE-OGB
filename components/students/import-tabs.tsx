"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { ImportForm } from "@/components/students/import-form";
import { UpdateProfilesForm } from "@/components/students/update-profiles-form";

const MODES = [
  {
    value: "new",
    label: "Add new students",
    description: "Creates a student and a profile for each row. Use this for people who aren't in the app yet.",
  },
  {
    value: "existing",
    label: "Add profiles to existing students",
    description: "Matches each row to a student who's already in the app, by name, and adds their profile. Nobody new is created.",
  },
] as const;

type Mode = (typeof MODES)[number]["value"];

export function ImportTabs({ cohorts }: { cohorts: { id: string; name: string }[] }) {
  const [mode, setMode] = useState<Mode>("new");
  const active = MODES.find((m) => m.value === mode)!;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div
          className="flex w-fit max-w-full flex-wrap gap-0.5 rounded-md border border-border bg-surface-muted p-0.5"
          role="group"
          aria-label="Import mode"
        >
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

      {mode === "new" ? <ImportForm cohorts={cohorts} /> : <UpdateProfilesForm cohorts={cohorts} />}
    </div>
  );
}
