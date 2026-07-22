"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

export function ChartModeToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "bar" ? "bar" : "line";

  function handleModeChange(newMode: "line" | "bar") {
    const params = new URLSearchParams(searchParams);
    if (newMode === "line") {
      params.delete("mode");
    } else {
      params.set("mode", "bar");
    }
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex h-8 items-center rounded-md border border-border bg-surface p-0.5">
      <button
        type="button"
        onClick={() => handleModeChange("line")}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-[4px] transition-colors",
          mode === "line"
            ? "bg-primary/10 text-primary-strong"
            : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
        )}
        title="Switch to Line Chart"
        aria-label="Line Chart"
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
            d="M2 13h12M3 10l3-4 4 3 4-6"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => handleModeChange("bar")}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-[4px] transition-colors",
          mode === "bar"
            ? "bg-primary/10 text-primary-strong"
            : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
        )}
        title="Switch to 3D Bar Chart"
        aria-label="3D Bar Chart"
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
            d="M2 13h12M4 13V8h2v5M8 13V5h2v8M12 13V10h2v3"
          />
        </svg>
      </button>
    </div>
  );
}
