# CSV export timeline filter design

## Problem

The "Export CSV" link on `/students` immediately downloads every student's
all-time average/last-recorded stats with no way to scope the export to a
recent period. The teacher wants to pick a timeline before exporting: All
time, 2 months, 1 month, or 1 week.

## Scope semantics

Trailing windows measured back from today (consistent with the dashboard's
week/month filters): "1 week" = last 7 days, "1 month" = last 30 days,
"2 months" = last 60 days, "All time" = no filter at all (today's existing
behavior, unchanged).

Picking a window **recomputes** each student's Average % and Last Recorded
columns using only scores from that window, and **excludes** students with
zero scores in the window entirely (they have nothing to show for that
period). "All time" includes every student exactly as today.

## Data layer

- New `lib/export-window.ts`:
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
  `"all"` has no entry in `EXPORT_WINDOW_DAYS` (no cutoff), which is how the
  data layer distinguishes "no filter" from a numeric window.

- New `getStudentsForExport(search?: string, window: ExportWindow = "all")`
  in `lib/data/students.ts`, reusing the existing private `mapStudentRow`
  helper (already used by `listStudents`). When `EXPORT_WINDOW_DAYS[window]`
  is defined, it scopes the included `scores` relation to
  `recordedAt: { gte: cutoff }` (same technique as the dashboard's
  `getTopPerformers`) and filters out students whose resulting
  `lastRecordedAt` is `null`. When `window === "all"`, no scores filter is
  applied and no student is excluded — identical output to today's
  `listStudents(search)` for export purposes.

## Route

`app/api/export/students/route.ts` reads a `window` query param via
`request.nextUrl.searchParams.get("window")`, normalizes it with
`normalizeExportWindow`, and calls `getStudentsForExport(search, window)`
instead of destructuring from `listStudents(search)`. The downloaded
filename becomes `students-{window}-{date}.csv` (e.g.
`students-week-2026-07-08.csv`) so exports for different windows don't
overwrite each other in a downloads folder.

## UI

The current plain `<a href="/api/export/students">Export CSV</a>` in
`app/(app)/students/page.tsx` is replaced by a new self-contained client
component, `components/students/export-csv-menu.tsx`:

- A button styled identically to today's Export CSV link, which toggles a
  small anchored dropdown menu (closes on outside click or on selecting an
  option).
- The menu lists exactly 4 options in this order: All time, 2 months,
  1 month, 1 week — each a plain `<a href="/api/export/students?window=...">`
  that triggers the browser's normal file download and closes the menu.
- No new dependency needed — click-outside-to-close is handled with a
  `mousedown` document listener in a `useEffect`, following this codebase's
  existing lightweight-custom-component convention (no dropdown/menu
  primitive exists yet in `components/ui/`).

**Note (explicitly out of scope):** the export route already reads a
`search` query param, but neither the current link nor the new menu's links
forward the on-screen search filter to it — a pre-existing gap this feature
does not fix. Only the `window` param is new.

## Edge cases

- Invalid/missing `window` value in the URL falls back to `"all"` — same
  fallback convention as `sort`/`range`/`topRange`/`improvedRange` elsewhere
  in this app.
- A student with scores outside the window (e.g., only scored 3 months ago,
  window = "1 week") is simply absent from that export — not included with
  blank stats.
- "All time" produces byte-identical output to today's export (no visible
  change for teachers who don't interact with the new menu).

## Testing

Manual verification in the browser (no automated test suite in this repo):

1. Click "Export CSV" with no interaction — confirm the dropdown opens
   showing exactly 4 options in the specified order, nothing downloads yet.
2. Click outside the open dropdown — confirm it closes without downloading.
3. Select "All time" — confirm the downloaded CSV matches today's existing
   full export exactly (same students, same stats).
4. Select "1 week" — confirm only students with a score in the last 7 days
   appear, with Average %/Last Recorded reflecting only that week's scores.
5. Select "1 month" and "2 months" — confirm progressively more (or equal)
   students appear as the window widens, and stats are recomputed per window
   (not just more rows added with the same all-time numbers).
6. Confirm each download's filename includes the correct window
   (`students-all-...`, `students-week-...`, etc.).
7. Confirm the students list page's search/sort/pagination controls are
   completely unaffected by this feature.
