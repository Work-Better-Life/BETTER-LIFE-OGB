"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TREND_RANGES, type TrendRange } from "@/lib/trend-ranges";

export function TrendRangeSelect({ value }: { value: TrendRange }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(range: string) {
    const params = new URLSearchParams(searchParams);
    params.set("range", range);
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      aria-label="Trend chart timeline"
      className="h-8 rounded-md border border-border bg-surface px-2 text-[13px] text-foreground"
    >
      {Object.entries(TREND_RANGES).map(([key, config]) => (
        <option key={key} value={key}>
          {config.label}
        </option>
      ))}
    </select>
  );
}
