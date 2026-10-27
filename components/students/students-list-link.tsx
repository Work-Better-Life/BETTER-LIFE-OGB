"use client";

import Link from "next/link";
import { useStudentsListHref } from "@/lib/students-list-memory";

// A link back to the students list that returns to the page, search, sort and
// cohort filter you were last looking at.
export function StudentsListLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Link href={useStudentsListHref()} className={className}>
      {children}
    </Link>
  );
}
