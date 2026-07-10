# CSV Export Timeline Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the teacher pick a timeline (All time / 2 months / 1 month / 1 week) before downloading the students CSV export, with stats recomputed per window.

**Architecture:** A new shared `ExportWindow` type (`"all" | "week" | "month" | "2months"`) lives in `lib/export-window.ts`. A new `getStudentsForExport` function in `lib/data/students.ts` (reusing the existing private `mapStudentRow` helper) applies a trailing-window cutoff to each student's `scores` before computing stats, excluding students with none in the window. `app/api/export/students/route.ts` reads a `window` query param and calls this new function instead of `listStudents`. The plain "Export CSV" link on `/students` becomes a small self-contained client component with a 4-option dropdown menu, each option linking to `/api/export/students?window=...`.

**Tech Stack:** Next.js App Router (server components + `"use client"` components, Route Handlers), Prisma (SQLite). No test runner is configured in this repo — verification is via `npx tsc --noEmit`, `npm run lint`, and manual browser checks against the dev server.

**No automated test framework:** This repo has no Jest/Vitest/etc. Do not add one for this feature. Each task below has explicit manual verification steps instead of automated test steps.

**No git repository:** This project has no `.git` directory (the user deleted it deliberately). Do not run any `git` command (`status`, `add`, `commit`, `init`, etc.) at any point in this plan — there are no commit steps below on purpose.

---

### Task 1: Add the `ExportWindow` type

**Files:**
- Create: `lib/export-window.ts`

- [ ] **Step 1: Write the file**

```ts
export type ExportWindow = "all" | "week" | "month" | "2months";

export const EXPORT_WINDOW_DAYS: Partial<Record<ExportWindow, number>> = {
  week: 7,
  month: 30,
  "2months": 60,
};

export const EXPORT_WINDOW_LABELS: Record<ExportWindow, string> = {
  all: "All time",
  "2months": "2 months",
  month: "1 month",
  week: "1 week",
};

export function normalizeExportWindow(value: string | null | undefined): ExportWindow {
  return value === "week" || value === "month" || value === "2months" || value === "all"
    ? value
    : "all";
}
```

`"all"` has no entry in `EXPORT_WINDOW_DAYS` — that absence (`undefined` when
indexed) is how later code distinguishes "no cutoff" from a numeric window.
`EXPORT_WINDOW_LABELS` is listed in the exact order the UI dropdown should
show options: All time, 2 months, 1 month, 1 week.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

---

### Task 2: Add `getStudentsForExport` to the data layer

**Files:**
- Modify: `lib/data/students.ts`

**Current relevant state:** this file already has a private (non-exported)
`mapStudentRow(student: RawStudentWithScores)` helper and a `scoresInclude`
object (both added by an earlier feature — sort/pagination support on
`listStudents`). Read the full current file first to confirm these exist
with these exact names before proceeding; if they don't, stop and report
back rather than guessing.

- [ ] **Step 1: Add the import**

At the top of `lib/data/students.ts`, alongside the existing imports, add:

```ts
import { EXPORT_WINDOW_DAYS, type ExportWindow } from "@/lib/export-window";
```

- [ ] **Step 2: Add the new function**

Add this new exported function anywhere after `mapStudentRow` is defined
(so it can reference it) — e.g. directly below `listStudents`:

```ts
export async function getStudentsForExport(search?: string, window: ExportWindow = "all") {
  const where = search
    ? {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { serialNumber: { contains: search } },
        ],
      }
    : undefined;

  const windowDays = EXPORT_WINDOW_DAYS[window];
  const scoresWhere = windowDays
    ? { recordedAt: { gte: new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000) } }
    : undefined;

  const students = await prisma.student.findMany({
    where,
    include: {
      scores: {
        where: scoresWhere,
        include: { topic: { include: { subject: true } } },
        orderBy: { recordedAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return students
    .map(mapStudentRow)
    .filter((student) => window === "all" || student.lastRecordedAt !== null);
}
```

Notes:
- When `window === "all"`, `windowDays` is `undefined`, so `scoresWhere` is
  `undefined` too — the `scores` relation include is unfiltered, identical
  to `listStudents`'s unpaginated/export code path today. No student is
  excluded (the `.filter(...)` short-circuits via `window === "all"`).
- For any other window, students whose only scores fall outside the cutoff
  end up with `student.scores === []`, so `mapStudentRow` gives them
  `lastRecordedAt: null` (and `averagePercentage: null`, since
  `averagePercentage` of an empty array is `null` per its existing
  implementation in `lib/scoring.ts`) — the `.filter(...)` then drops them.
- This duplicates the `where`-building block from `listStudents` rather
  than extracting a shared helper — it's a 6-line block that's simple
  enough to repeat once without adding an abstraction (YAGNI); if a third
  caller needs the same `where` logic, extract it then.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification via a temporary script**

Run: `npx tsx -e "import('./lib/data/students.ts').then(async (m) => { console.log('all', (await m.getStudentsForExport(undefined, 'all')).length); console.log('week', (await m.getStudentsForExport(undefined, 'week')).map(s => [s.firstName, s.lastRecordedAt])); console.log('month', (await m.getStudentsForExport(undefined, 'month')).length); console.log('2months', (await m.getStudentsForExport(undefined, '2months')).length); })"`

Expected: `all` prints the total student count in your dev DB (every
student, regardless of scores); `week` prints only students with a score
in the last 7 days, each with a non-null `lastRecordedAt`; `month` and
`2months` print counts that are `>=` the `week` count and `<=` the `all`
count (widening the window never removes students, only adds them). If the
`tsx -e` inline import doesn't work smoothly against a `.ts` module outside
the Next.js runtime, skip this and rely on Task 4's browser verification
instead — this is a sanity check, not a blocker.

---

### Task 3: Wire the `window` param into the export route

**Files:**
- Modify: `app/api/export/students/route.ts`

**Current file (for reference — read it yourself first to confirm it
still matches before editing):**

```ts
import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { listStudents } from "@/lib/data/students";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const { students } = await listStudents(search);

  const header = ["Serial Number", "First Name", "Last Name", "Subjects", "Average %", "Last Recorded"];
  const rows = students.map((student) => [
    student.serialNumber,
    student.firstName,
    student.lastName,
    student.subjectNames.join("; "),
    student.averagePercentage !== null ? student.averagePercentage.toFixed(1) : "",
    student.lastRecordedAt ? new Date(student.lastRecordedAt).toISOString().slice(0, 10) : "",
  ]);

  const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="students-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
```

- [ ] **Step 1: Replace the file contents**

```ts
import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getStudentsForExport } from "@/lib/data/students";
import { normalizeExportWindow } from "@/lib/export-window";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const window = normalizeExportWindow(request.nextUrl.searchParams.get("window"));
  const students = await getStudentsForExport(search, window);

  const header = ["Serial Number", "First Name", "Last Name", "Subjects", "Average %", "Last Recorded"];
  const rows = students.map((student) => [
    student.serialNumber,
    student.firstName,
    student.lastName,
    student.subjectNames.join("; "),
    student.averagePercentage !== null ? student.averagePercentage.toFixed(1) : "",
    student.lastRecordedAt ? new Date(student.lastRecordedAt).toISOString().slice(0, 10) : "",
  ]);

  const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="students-${window}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
```

Changes: import `getStudentsForExport`/`normalizeExportWindow` instead of
`listStudents`; read and normalize a new `window` search param; call
`getStudentsForExport(search, window)` directly (it already returns a plain
array, not `{ students, total }`, so no destructuring needed — note this is
a different return shape than `listStudents`, intentionally, since export
never needed `total`); the CSV row-building logic is completely unchanged;
the filename gains a `{window}` segment.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint "app/api/export/students/route.ts"`
Expected: no errors.

- [ ] **Step 4: Manual verification**

With the dev server running (`npm run dev`) and after logging in, visit
these URLs directly in the browser (or via an authenticated `curl`/fetch if
browser login isn't available) and confirm each downloads a CSV:
- `/api/export/students` (no `window` param) → filename
  `students-all-<date>.csv`, contents identical to before this change.
- `/api/export/students?window=week` → filename `students-week-<date>.csv`,
  fewer or equal rows vs. the "all" export, each with a Last Recorded date
  within the last 7 days.
- `/api/export/students?window=month` and `?window=2months` → similarly
  scoped, row counts between "week" and "all".
- `/api/export/students?window=garbage` → falls back to "all" behavior
  (via `normalizeExportWindow`), filename `students-all-<date>.csv`.

---

### Task 4: Add the `ExportCsvMenu` component and wire it into the students page

**Files:**
- Create: `components/students/export-csv-menu.tsx`
- Modify: `app/(app)/students/page.tsx`

- [ ] **Step 1: Write the component**

```tsx
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
          role="menu"
          aria-label="Export timeline"
          className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-border bg-surface p-1 shadow-floating"
        >
          {OPTIONS.map((option) => (
            <a
              key={option}
              role="menuitem"
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
```

This is a self-contained client component with its own open/closed state
and a `mousedown` document listener to close on outside click — no new
dependency needed, and no existing dropdown/menu primitive to reuse (none
exists yet in `components/ui/`). The button's className is copied verbatim
from the current "Export CSV" `<a>` in `app/(app)/students/page.tsx` so the
visual replacement is seamless. `shadow-floating` is an existing Tailwind
class already used by `components/ui/confirm-dialog.tsx`.

- [ ] **Step 2: Update the students page**

In `app/(app)/students/page.tsx`, replace this block:

```tsx
            <a
              href="/api/export/students"
              className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-border bg-surface-muted px-3 text-[13px] font-medium text-foreground transition-colors duration-150 hover:bg-border/60 active:scale-[0.97]"
            >
              Export CSV
            </a>
```

with:

```tsx
            <ExportCsvMenu />
```

And add the import alongside the other component imports at the top of the
file:

```tsx
import { ExportCsvMenu } from "@/components/students/export-csv-menu";
```

Nothing else in the file changes — `SearchBox`, `SortSelect`, `Pagination`,
and the overall layout are untouched.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `npx eslint "components/students/export-csv-menu.tsx" "app/(app)/students/page.tsx"`
Expected: no errors.

- [ ] **Step 5: Manual browser verification**

Run `npm run dev` (or use the already-running dev server), log in, visit
`/students`, and:
1. Click "Export CSV" — confirm a dropdown opens showing exactly 4 options
   in this order: All time, 2 months, 1 month, 1 week. Nothing downloads
   yet.
2. Click somewhere outside the open dropdown — confirm it closes without
   triggering a download.
3. Click "Export CSV" again, then click "All time" — confirm a CSV
   downloads named `students-all-<date>.csv` and the dropdown closes.
4. Repeat for "1 week" — confirm the filename is `students-week-<date>.csv`
   and (per Task 3's verification) the contents are scoped to the last 7
   days.
5. Confirm the search box, sort dropdown, and pagination controls on this
   page are completely unaffected by this change.

---

## Self-Review Notes

- **Spec coverage:** trailing-window semantics + "all" as no-filter (Task 1), stats recomputed + zero-score students excluded (Task 2), route wiring + filename with window (Task 3), dropdown UI with the 4 options in the specified order (Task 4), explicit non-fix of the pre-existing search-not-forwarded gap (mentioned in Task 1/4 context, not touched by any task) — all covered.
- **Type consistency:** `ExportWindow` (`"all" | "week" | "month" | "2months"`) defined once in `lib/export-window.ts` (Task 1), imported by both `lib/data/students.ts` (Task 2) and `components/students/export-csv-menu.tsx` (Task 4) — no duplicated union type, since `lib/export-window.ts` has no server-only dependencies and is safe for a client component to import (same reasoning as `lib/stat-window.ts` in the dashboard filter feature).
- **No placeholders:** every step shows complete code or an exact command with expected output.
- **No git steps:** this project has no `.git` directory; no task includes a commit step, and no task should run any `git` command.
