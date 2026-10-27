"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { STUDENT_OVERVIEW_RANGES, type StudentOverviewRange } from "@/lib/trend-ranges";

// Chooses the period the attendance badge is worked out over, on the profile page.
// Kept in the address (?period=3m) so it survives a refresh and can be shared.
export function AttendancePeriodSelect({ studentId, value }: { studentId: string; value: StudentOverviewRange }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(period: string) {
    const params = new URLSearchParams(searchParams);
    if (period === "all") params.delete("period");
    else params.set("period", period);
    const query = params.toString();
    router.replace(query ? `/students/${studentId}/profile?${query}` : `/students/${studentId}/profile`, { scroll: false });
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      aria-label="Attendance period"
      className="h-7 rounded-md border border-border bg-surface px-1.5 text-xs text-foreground"
    >
      {Object.entries(STUDENT_OVERVIEW_RANGES).map(([key, config]) => (
        <option key={key} value={key}>
          {config.label}
        </option>
      ))}
    </select>
  );
}
