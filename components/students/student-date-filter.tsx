"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/input";

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
  q,
}: {
  studentId: string;
  startDate?: string;
  endDate?: string;
  q?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasFilter = !!(startDate || endDate || q);
  const [open, setOpen] = useState(hasFilter);



  const [prevQ, setPrevQ] = useState(q);
  const [searchValue, setSearchValue] = useState(q ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (q !== prevQ) {
    setPrevQ(q);
    setSearchValue(q ?? "");
  }

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const currentQ = searchParams.get("q") ?? "";
      if (searchValue !== currentQ) {
        const params = new URLSearchParams(searchParams);
        if (searchValue) params.set("q", searchValue);
        else params.delete("q");
        router.replace(`/students/${studentId}?${params.toString()}`, {
          scroll: false,
        });
      }
    }, 250);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [searchValue, searchParams, studentId, router]);

  function updateParams(start?: string, end?: string) {
    const params = new URLSearchParams(searchParams);
    if (start) params.set("startDate", start);
    else params.delete("startDate");
    if (end) params.set("endDate", end);
    else params.delete("endDate");
    if (searchValue) params.set("q", searchValue);
    else params.delete("q");
    router.replace(`/students/${studentId}?${params.toString()}`, {
      scroll: false,
    });
  }

  function handleClear() {
    setSearchValue("");
    const params = new URLSearchParams(searchParams);
    params.delete("startDate");
    params.delete("endDate");
    params.delete("q");
    router.replace(`/students/${studentId}?${params.toString()}`, {
      scroll: false,
    });
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
          <div className="flex flex-col items-end w-full pt-0">
            {/* Search Bar */}
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search topics..."
              className="h-9 text-[13px] px-3 w-full max-w-[260px] md:max-w-[280px] mt-3 mb-3"
            />

            {/* Date Pickers */}
            <div className="flex items-center gap-2 mt-1 mb-2">
              {/* From date button */}
              <label className="relative cursor-pointer">
                <span
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
                </span>
                <input

                  type="date"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={startDate || ""}
                  max={endDate || undefined}
                  onChange={(e) => updateParams(e.target.value, endDate)}
                  tabIndex={-1}
                />
              </label>

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
              <label className="relative cursor-pointer">
                <span
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
                </span>
                <input

                  type="date"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={endDate || ""}
                  min={startDate || undefined}
                  onChange={(e) => updateParams(startDate, e.target.value)}
                  tabIndex={-1}
                />
              </label>

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
    </div>
  );
}
