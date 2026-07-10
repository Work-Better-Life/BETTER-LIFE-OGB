"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { STAT_WINDOW_LABELS, type StatWindow } from "@/lib/stat-window";

const OPTIONS: StatWindow[] = ["week", "month"];

export function StatWindowToggle({
  paramName,
  value,
  label,
}: {
  paramName: string;
  value: StatWindow;
  label: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSelect(next: StatWindow) {
    const params = new URLSearchParams(searchParams);
    params.set(paramName, next);
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }

  return (
    <div
      className="flex gap-0.5 rounded-md border border-border bg-surface-muted p-0.5"
      role="group"
      aria-label={label}
    >
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => handleSelect(option)}
          aria-pressed={value === option}
          className={cn(
            "rounded-[5px] px-2.5 py-1 text-[13px] font-medium transition-colors",
            value === option
              ? "bg-surface text-foreground shadow-sm"
              : "text-foreground-muted hover:text-foreground"
          )}
        >
          {STAT_WINDOW_LABELS[option]}
        </button>
      ))}
    </div>
  );
}
