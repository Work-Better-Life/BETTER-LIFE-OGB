# Dashboard Stat Window Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "Top performers" and "Most improved" on `/dashboard` time-scoped (defaulting to a trailing month), each with its own Week/Month segmented toggle.

**Architecture:** A new shared `StatWindow` type (`"week" | "month"`) lives in `lib/stat-window.ts`. `getTopPerformers` and `getMostImproved` in `lib/data/dashboard.ts` each grow a `window: StatWindow` parameter that controls how far back they look. Two independent URL query params (`topRange`, `improvedRange`) on `/dashboard` drive the two sections separately, read server-side in `app/(app)/dashboard/page.tsx`. A new client component `components/dashboard/stat-window-toggle.tsx`, modeled on the existing `TrendRangeSelect`, renders a 2-button segmented control and writes the chosen value back into the URL.

**Tech Stack:** Next.js App Router (server components + `"use client"` components), Prisma (SQLite). No test runner is configured in this repo — verification is via `npx tsc --noEmit`, `npm run lint`, and manual browser checks against the dev server.

**No automated test framework:** This repo has no Jest/Vitest/etc. Do not add one for this feature. Each task below has explicit manual verification steps instead of automated test steps.

**Auth note for manual verification:** `/dashboard` sits behind this app's cookie-based auth (`proxy.ts`/`lib/auth.ts`). If you can't log in through a real browser during verification, you may need to generate a valid session cookie for a `curl`-based check the same way a prior task in this codebase did — read `lib/auth.ts` for the cookie-signing scheme, use an existing user's `id`/`sessionVersion` from the dev SQLite DB, and **delete any temporary script you write afterward**. Don't skip verification; note clearly in your report which checks were done via real browser vs. curl.

---

### Task 1: Add the `StatWindow` type

**Files:**
- Create: `lib/stat-window.ts`

- [ ] **Step 1: Write the file**

```ts
export type StatWindow = "week" | "month";

export const STAT_WINDOW_DAYS: Record<StatWindow, number> = {
  week: 7,
  month: 30,
};

export const STAT_WINDOW_LABELS: Record<StatWindow, string> = {
  week: "Week",
  month: "Month",
};

export function normalizeStatWindow(value: string | undefined): StatWindow {
  return value === "week" || value === "month" ? value : "month";
}
```

This mirrors the existing `lib/trend-ranges.ts` pattern (a `Record` keyed by a
union type, plus a normalize function analogous to the students list's
`normalizeSort` in `lib/data/students.ts`). `STAT_WINDOW_LABELS` is for the UI
toggle's button text ("Week" / "Month"); the raw lowercase `StatWindow` value
itself (`"week"` / `"month"`) doubles as the word used in sentences like
"last week" / "last month" in Task 4's copy — no separate mapping needed for
that.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/stat-window.ts
git commit -m "feat: add StatWindow type for dashboard time-window filters"
```

---

### Task 2: Add `window` support to `getTopPerformers` and `getMostImproved`

**Files:**
- Modify: `lib/data/dashboard.ts`

- [ ] **Step 1: Add the import**

At the top of `lib/data/dashboard.ts`, alongside the existing imports, add:

```ts
import { STAT_WINDOW_DAYS, type StatWindow } from "@/lib/stat-window";
```

- [ ] **Step 2: Update `getTopPerformers`**

Replace the current `getTopPerformers` function:

```ts
export async function getTopPerformers(limit = 5) {
  const students = await prisma.student.findMany({
    include: { scores: { select: { value: true, maxScore: true, recordedAt: true } } },
  });

  return students
    .map((student) => ({
      id: student.id,
      serialNumber: student.serialNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      averagePercentage: averagePercentage(student.scores),
    }))
    .filter((s) => s.averagePercentage !== null)
    .sort((a, b) => (b.averagePercentage ?? 0) - (a.averagePercentage ?? 0))
    .slice(0, limit);
}
```

with:

```ts
export async function getTopPerformers(limit = 5, window: StatWindow = "month") {
  const cutoff = new Date(Date.now() - STAT_WINDOW_DAYS[window] * 24 * 60 * 60 * 1000);

  const students = await prisma.student.findMany({
    include: {
      scores: {
        where: { recordedAt: { gte: cutoff } },
        select: { value: true, maxScore: true, recordedAt: true },
      },
    },
  });

  return students
    .map((student) => ({
      id: student.id,
      serialNumber: student.serialNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      averagePercentage: averagePercentage(student.scores),
    }))
    .filter((s) => s.averagePercentage !== null)
    .sort((a, b) => (b.averagePercentage ?? 0) - (a.averagePercentage ?? 0))
    .slice(0, limit);
}
```

The only change is the new `window` parameter, the `cutoff` calculation, and
scoping the included `scores` relation to `recordedAt: { gte: cutoff } }` via
a `where` inside the `include`. A student with zero scores in the window
ends up with `averagePercentage === null` (same as today's "no scores at
all" case) and is filtered out by the existing `.filter(...)` line —
no change needed there.

- [ ] **Step 3: Update `getMostImproved`**

Replace the current signature and cutoff line:

```ts
export async function getMostImproved(limit = 5, lookbackDays = 30) {
  const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
```

with:

```ts
export async function getMostImproved(limit = 5, window: StatWindow = "month") {
  const cutoff = new Date(Date.now() - STAT_WINDOW_DAYS[window] * 24 * 60 * 60 * 1000);
```

Everything else in the function body is unchanged — it already computes and
uses `cutoff` throughout, so this is a two-line change.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification via a temporary script**

Run: `npx tsx -e "import('./lib/data/dashboard.ts').then(async (m) => { console.log('week', (await m.getTopPerformers(5, 'week')).map(s => [s.firstName, s.averagePercentage])); console.log('month', (await m.getTopPerformers(5, 'month')).map(s => [s.firstName, s.averagePercentage])); console.log('improved-week', (await m.getMostImproved(5, 'week')).map(s => [s.firstName, s.averageDelta])); console.log('improved-month', (await m.getMostImproved(5, 'month')).map(s => [s.firstName, s.averageDelta])); })"`

Expected: four printed arrays. `week` and `month` for top performers may
differ if any qualifying score falls between 7 and 30 days ago; if your dev
data has no scores older than a week, `week` and `month` results will be
identical, which is still correct behavior (just not a very interesting
check on this particular dataset). This is a sanity check, not a blocker —
if the `tsx -e` inline import doesn't work smoothly against a `.ts` module
outside the Next.js runtime, skip it and rely on Task 4's browser
verification instead.

- [ ] **Step 6: Commit**

```bash
git add lib/data/dashboard.ts
git commit -m "feat: add window parameter to getTopPerformers and getMostImproved"
```

---

### Task 3: Add the `StatWindowToggle` component

**Files:**
- Create: `components/dashboard/stat-window-toggle.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { STAT_WINDOW_LABELS, type StatWindow } from "@/lib/stat-window";

const OPTIONS: StatWindow[] = ["week", "month"];

export function StatWindowToggle({
  paramName,
  value,
}: {
  paramName: string;
  value: StatWindow;
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
      aria-label="Time window"
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
```

This is a single component parameterized by `paramName` (`"topRange"` or
`"improvedRange"`) and `value`, used twice in Task 4 rather than written as
two near-duplicate files. It mirrors `components/dashboard/trend-range-select.tsx`'s
pattern of reading/writing a URL param via `useSearchParams`/`router.replace`
(including the `{ scroll: false }` option, so toggling doesn't jump the page
back to the top), but renders as a 2-button segmented control instead of a
`<select>`, per the approved design. Colors (`bg-surface-muted`,
`border-border`, `bg-surface`, `text-foreground`, `text-foreground-muted`)
are existing design tokens already used throughout this codebase (see
`components/ui/button.tsx`, `components/dashboard/stat-tile.tsx`).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/stat-window-toggle.tsx
git commit -m "feat: add StatWindowToggle component"
```

---

### Task 4: Wire the toggles into the dashboard page

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import Link from "next/link";
import {
  getDashboardCounts,
  getScoreTrend,
  getTopPerformers,
  getMostImproved,
  getRecentScoreEntries,
} from "@/lib/data/dashboard";
import { TREND_RANGES, type TrendRange } from "@/lib/trend-ranges";
import { normalizeStatWindow } from "@/lib/stat-window";
import { StatTile } from "@/components/dashboard/stat-tile";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { TrendRangeSelect } from "@/components/dashboard/trend-range-select";
import { StatWindowToggle } from "@/components/dashboard/stat-window-toggle";
import { DeltaIndicator } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function parseTrendRange(value: string | undefined): TrendRange {
  return value && value in TREND_RANGES ? (value as TrendRange) : "30d";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; topRange?: string; improvedRange?: string }>;
}) {
  const { range: rangeParam, topRange: topRangeParam, improvedRange: improvedRangeParam } =
    await searchParams;
  const range = parseTrendRange(rangeParam);
  const topWindow = normalizeStatWindow(topRangeParam);
  const improvedWindow = normalizeStatWindow(improvedRangeParam);

  const [counts, trend, topPerformers, mostImproved, recent] =
    await Promise.all([
      getDashboardCounts(),
      getScoreTrend(range),
      getTopPerformers(5, topWindow),
      getMostImproved(5, improvedWindow),
      getRecentScoreEntries(10),
    ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            A quick look at who&apos;s climbing and what&apos;s recent.
          </p>
        </div>
        <Link href="/scores/record">
          <Button className="flex gap-1">
            <p>Record a test</p>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile
          label="Total Students"
          value={counts.students}
          tone="primary"
        />
        <StatTile label="Subjects" value={counts.subjects} tone="blue" />
        <StatTile label="Topics" value={counts.topics} tone="amber" />
        <StatTile
          label="Score Entries"
          value={counts.scoreEntries}
          tone="rose"
        />
      </div>

      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg text-foreground">
              Score trend
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Average score across all students over the last{" "}
              {TREND_RANGES[range].label.replace(/^1 /, "")}.
            </p>
          </div>
          <TrendRangeSelect value={range} />
        </div>
        <div className="mt-4">
          <TrendChart data={trend.points} unit={trend.unit} />
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg text-foreground">
                Top performers
              </h2>
              <p className="mt-1 text-sm text-foreground-muted">
                Highest average score in the last {topWindow}.
              </p>
            </div>
            <StatWindowToggle paramName="topRange" value={topWindow} />
          </div>
          {topPerformers.length === 0 ? (
            <p className="mt-4 text-sm text-foreground-muted">
              No scores recorded in the last {topWindow}.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {topPerformers.map((student) => (
                <li key={student.id}>
                  <Link
                    href={`/students/${student.id}`}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-surface-muted"
                  >
                    <span className="text-sm text-foreground">
                      {student.firstName} {student.lastName}
                    </span>
                    <span className="font-display text-sm text-primary-strong">
                      {student.averagePercentage?.toFixed(1)}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg text-foreground">
                Most improved
              </h2>
              <p className="mt-1 text-sm text-foreground-muted">
                Biggest score gains in the last {improvedWindow}.
              </p>
            </div>
            <StatWindowToggle paramName="improvedRange" value={improvedWindow} />
          </div>
          {mostImproved.length === 0 ? (
            <p className="mt-4 text-sm text-foreground-muted">
              Worth a look once there are at least two scores on the same topic in the last {improvedWindow}.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {mostImproved.map((student) => (
                <li key={student.id}>
                  <Link
                    href={`/students/${student.id}`}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-surface-muted"
                  >
                    <span className="text-sm text-foreground">
                      {student.firstName} {student.lastName}
                    </span>
                    <DeltaIndicator value={student.averageDelta} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-lg text-foreground">
          Recent activity
        </h2>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-foreground-muted">
            No scores recorded yet.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {recent.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <div>
                  <Link
                    href={`/students/${entry.studentId}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {entry.studentName}
                  </Link>
                  <span className="text-foreground-muted">
                    {" "}
                    · {entry.subjectName} / {entry.topicName}
                  </span>
                </div>
                <span className="font-display text-foreground">
                  {entry.value}/{entry.maxScore}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

Changes from the current file: new imports (`normalizeStatWindow`,
`StatWindowToggle`); `searchParams` type gains `topRange?: string` and
`improvedRange?: string`; `topWindow`/`improvedWindow` are computed and
passed as the second argument to `getTopPerformers`/`getMostImproved`; the
"Top performers" and "Most improved" section headers each gain a
`flex items-start justify-between` wrapper div containing the existing
title/subtitle on the left and a new `StatWindowToggle` on the right; both
subtitles and both empty-state messages are reworded to reference
`{topWindow}`/`{improvedWindow}` instead of static text. The "Score trend"
section and "Recent activity" section are untouched.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors introduced by this file (the repo may have
pre-existing unrelated lint failures in other files — ignore those, confirm
`app/(app)/dashboard/page.tsx` itself is clean, e.g. via
`npx eslint "app/(app)/dashboard/page.tsx"`).

- [ ] **Step 4: Manual browser verification**

Run: `npm run dev` (or use the already-running dev server), then visit
`/dashboard` (see the plan header's auth note if login is required) and:

1. With no `topRange`/`improvedRange` in the URL, confirm both "Top
   performers" and "Most improved" show "Month" selected in their toggle,
   and their subtitles read "...in the last month." / "...gains in the last
   month."
2. Click "Week" on the "Top performers" toggle — confirm the URL gains
   `?topRange=week`, the subtitle changes to "...in the last week.", the
   list updates (or stays the same if no scores fall outside the 7-day
   window — check by comparing to Step 1's data), and "Most improved" is
   completely unaffected (still on "Month").
3. Click "Week" on the "Most improved" toggle — confirm `?improvedRange=week`
   is added (alongside any existing `topRange` param), its subtitle and list
   update, and "Top performers" is unaffected.
4. Reload the page with `?topRange=week&improvedRange=month` in the URL —
   confirm both toggles show the correct selected button and both sections'
   data match those windows.
5. Confirm the "Score trend" chart and its own range dropdown are completely
   unaffected by anything above.
6. If your dev data has a student with scores only recorded more than 7 days
   but less than 30 days ago, confirm they appear under "Month" but not
   under "Week" for whichever section applies — this validates the
   window actually filters data, not just the label.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/dashboard/page.tsx"
git commit -m "feat: add week/month filters to dashboard top performers and most improved"
```

---

## Self-Review Notes

- **Spec coverage:** trailing-window semantics (Task 1's `STAT_WINDOW_DAYS`), independent per-section filters (Task 4's two separate `paramName`s), segmented toggle control style (Task 3), default "month" (Task 1's `normalizeStatWindow` + both data functions' default params), data layer changes for both widgets (Task 2), copy changes for subtitles/empty states (Task 4) — all covered.
- **Type consistency:** `StatWindow` (`"week" | "month"`) is defined once in `lib/stat-window.ts` (Task 1) and imported by both `lib/data/dashboard.ts` (Task 2) and `components/dashboard/stat-window-toggle.tsx` (Task 3) — no duplicated union type, unlike the students-list sort feature where the client component couldn't import from the server-only data module. Here `lib/stat-window.ts` has no server-only dependencies, so it's safely shared by both.
- **No placeholders:** every step shows complete code or an exact command with expected output.
