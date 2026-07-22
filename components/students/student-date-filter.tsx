"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef } from "react";
import { cn } from "@/lib/cn";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function StudentDateFilter({
  studentId,
  startDate,
  endDate,
}: {
  studentId: string;
  startDate?: string;
  endDate?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasFilter = !!(startDate || endDate);
  const [open, setOpen] = useState(hasFilter);

  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  function updateParams(start?: string, end?: string) {
    const params = new URLSearchParams(searchParams);
    if (start) params.set("startDate", start);
    else params.delete("startDate");
    if (end) params.set("endDate", end);
    else params.delete("endDate");
    router.replace(`/students/${studentId}?${params.toString()}`, {
      scroll: false,
    });
  }

  function handleClear() {
    updateParams(undefined, undefined);
    setOpen(false);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-all",
          hasFilter
            ? "border-primary bg-primary/10 text-primary-strong"
            : "border-border bg-surface text-foreground-muted hover:bg-surface-muted hover:text-foreground"
        )}
      >
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2 4h12M4 8h8M6 12h4"
          />
        </svg>
        Filter
        {hasFilter && (
          <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
            ✓
          </span>
        )}
      </button>

      {/* Animated date pickers */}
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          open
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="flex items-center gap-2 pt-1">
            {/* From date button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => startRef.current?.showPicker()}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] font-medium transition-colors",
                  startDate
                    ? "border-primary/30 bg-primary/5 text-foreground"
                    : "border-border bg-surface text-foreground-muted hover:bg-surface-muted hover:text-foreground"
                )}
              >
                <svg
                  viewBox="0 0 16 16"
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="2" y="3" width="12" height="11" rx="1.5" />
                  <path d="M5 1.5V4M11 1.5V4M2 6.5h12" />
                </svg>
                {startDate ? formatDate(startDate) : "From"}
              </button>
              <input
                ref={startRef}
                type="date"
                className="invisible absolute inset-0 h-0 w-0"
                value={startDate || ""}
                max={endDate || undefined}
                onChange={(e) => updateParams(e.target.value, endDate)}
                tabIndex={-1}
              />
            </div>

            {/* Arrow separator */}
            <svg
              viewBox="0 0 16 16"
              className="h-3 w-3 shrink-0 text-foreground-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8h10M9 4l4 4-4 4"
              />
            </svg>

            {/* To date button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => endRef.current?.showPicker()}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] font-medium transition-colors",
                  endDate
                    ? "border-primary/30 bg-primary/5 text-foreground"
                    : "border-border bg-surface text-foreground-muted hover:bg-surface-muted hover:text-foreground"
                )}
              >
                <svg
                  viewBox="0 0 16 16"
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="2" y="3" width="12" height="11" rx="1.5" />
                  <path d="M5 1.5V4M11 1.5V4M2 6.5h12" />
                </svg>
                {endDate ? formatDate(endDate) : "To"}
              </button>
              <input
                ref={endRef}
                type="date"
                className="invisible absolute inset-0 h-0 w-0"
                value={endDate || ""}
                min={startDate || undefined}
                onChange={(e) => updateParams(startDate, e.target.value)}
                tabIndex={-1}
              />
            </div>

            {/* Clear button — only when a filter is active */}
            {hasFilter && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-surface-muted hover:text-danger"
                aria-label="Clear filter"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4l8 8M12 4l-8 8"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
