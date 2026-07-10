"use client";

import { useEffect, useRef, useState } from "react";
import { EXPORT_WINDOW_LABELS, type ExportWindow } from "@/lib/export-window";

const OPTIONS: ExportWindow[] = ["all", "2months", "month", "week"];

export function ExportCsvMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-border bg-surface-muted px-3 text-[13px] font-medium text-foreground transition-colors duration-150 hover:bg-border/60 active:scale-[0.97]"
      >
        Export CSV
      </button>
      {open && (
        <div
          aria-label="Export timeline"
          className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-border bg-surface p-1 shadow-floating"
        >
          {OPTIONS.map((option) => (
            <a
              key={option}
              href={`/api/export/students?window=${option}`}
              onClick={() => setOpen(false)}
              className="block rounded-sm px-3 py-1.5 text-[13px] text-foreground transition-colors hover:bg-surface-muted"
            >
              {EXPORT_WINDOW_LABELS[option]}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
