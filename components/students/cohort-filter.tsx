"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

// Filters the students list by cohort via the ?cohort= URL param, so it
// combines with search and sort and survives a refresh. "none" means students
// who aren't in any cohort.
export function CohortFilter({
  cohorts,
  className,
}: {
  cohorts: { id: string; name: string }[];
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("cohort") ?? "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams);
    if (e.target.value === "") params.delete("cohort");
    else params.set("cohort", e.target.value);
    params.delete("page");
    router.replace(`/students?${params.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      aria-label="Filter students by cohort"
      className={cn(
        "h-10 rounded-md border border-border bg-surface px-3 text-sm text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
        className
      )}
    >
      <option value="">All cohorts</option>
      <option value="none">No cohort</option>
      {cohorts.map((cohort) => (
        <option key={cohort.id} value={cohort.id}>
          {cohort.name}
        </option>
      ))}
    </select>
  );
}
