"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { STUDENT_OVERVIEW_RANGES, type StudentOverviewRange } from "@/lib/trend-ranges";

export function StudentRangeSelect({ studentId, value }: { studentId: string; value: StudentOverviewRange }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(range: string) {
    const params = new URLSearchParams(searchParams);
    if (range === "all") params.delete("range");
    else params.set("range", range);
    router.replace(`/students/${studentId}?${params.toString()}`, { scroll: false });
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      aria-label="Time range"
      className="h-9 rounded-md border border-border bg-surface px-2 text-[13px] text-foreground"
    >
      {Object.entries(STUDENT_OVERVIEW_RANGES).map(([key, config]) => (
        <option key={key} value={key}>
          {config.label}
        </option>
      ))}
    </select>
  );
}
