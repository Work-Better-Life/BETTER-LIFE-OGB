"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

const NEW_COHORT_VALUE = "__new__";

type CohortOption = { id: string; name: string };

const selectClasses =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

// Dropdown of cohorts with "No cohort" and "+ New cohort…". Choosing the last
// reveals a name box. The field names (`cohortId`, `newCohortName`) match what
// the student and import actions read, so it works inside a plain <form> too.
export function CohortSelect({
  cohorts,
  value,
  newName,
  onChange,
  onNewNameChange,
  id = "cohortId",
  className,
}: {
  cohorts: CohortOption[];
  value: string;
  newName: string;
  onChange: (value: string) => void;
  onNewNameChange: (name: string) => void;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <select id={id} name="cohortId" value={value} onChange={(e) => onChange(e.target.value)} className={selectClasses}>
        <option value="">No cohort</option>
        {cohorts.map((cohort) => (
          <option key={cohort.id} value={cohort.id}>
            {cohort.name}
          </option>
        ))}
        <option value={NEW_COHORT_VALUE}>+ New cohort…</option>
      </select>
      {value === NEW_COHORT_VALUE && (
        <Input
          name="newCohortName"
          value={newName}
          onChange={(e) => onNewNameChange(e.target.value)}
          placeholder="e.g. 2026"
          maxLength={60}
          aria-label="New cohort name"
          autoFocus
        />
      )}
    </div>
  );
}
