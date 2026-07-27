"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type RankedStudent = {
  id: string;
  firstName: string;
  lastName: string;
  averagePercentage: number | null;
  testedInWindow: boolean;
};

export function TopPerformersOverflow({
  students,
  startRank,
  notTestedLabel,
}: {
  students: RankedStudent[];
  startRank: number;
  notTestedLabel: string;
}) {
  const [open, setOpen] = useState(false);

  if (students.length === 0) return null;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 -mx-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        <span>
          {open ? "Hide" : "Show"} everyone else ({students.length})
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1">
          {students.map((student, index) => (
            <li key={student.id}>
              <Link
                href={`/students/${student.id}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-surface-muted"
              >
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <span className="w-5 shrink-0 text-xs tabular-nums text-foreground-muted">
                    {startRank + index}
                  </span>
                  {student.firstName} {student.lastName}
                </span>
                {student.testedInWindow ? (
                  <span className="font-display text-sm text-primary-strong">
                    {student.averagePercentage?.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-xs italic text-foreground-muted">
                    {notTestedLabel}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
