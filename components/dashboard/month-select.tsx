"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { recentMonthOptions } from "@/lib/stat-window";

export function MonthSelect({
  paramName,
  value,
  label,
}: {
  paramName: string;
  value: string;
  label: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const options = recentMonthOptions(12);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams);
    params.set(paramName, e.target.value);
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      aria-label={label}
      className="h-8 rounded-md border border-border bg-surface px-2 text-[13px] text-foreground"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
