# Dashboard stat window filter design

## Problem

The dashboard's "Top performers" section ranks students by all-time average
score with no time bound at all. "Most improved" already has a time bound,
but it's hardcoded to a 30-day trailing lookback with no way to change it.
The teacher wants both widgets to default to a trailing month, with a way to
switch each one independently to a trailing week.

## Time window semantics

Both widgets use a **trailing window measured back from today**, not a
calendar period — "week" means "the last 7 days," "month" means "the last 30
days," consistent with the convention the existing "Score trend" chart
already uses (`lib/trend-ranges.ts`'s `TREND_RANGES`). This avoids the window
going sparse right after a calendar boundary (e.g. the 1st of the month).

```ts
// lib/stat-window.ts
export type StatWindow = "week" | "month";

export const STAT_WINDOW_DAYS: Record<StatWindow, number> = {
  week: 7,
  month: 30,
};
```

## Data layer

`lib/data/dashboard.ts`:

- `getTopPerformers(limit = 5, window: StatWindow = "month")`: when
  selecting each student's `scores` for averaging, add a `recordedAt: { gte:
  cutoff }` filter, where `cutoff = new Date(Date.now() - STAT_WINDOW_DAYS[window]
  * 24 * 60 * 60 * 1000)`. Everything else (average, filter out nulls, sort
  descending, slice to `limit`) stays as-is. A student with zero scores in
  the window is excluded from the ranking, exactly like today's "no scores at
  all" case.
- `getMostImproved(limit = 5, window: StatWindow = "month")`: replaces the
  current hardcoded `lookbackDays = 30` parameter with
  `STAT_WINDOW_DAYS[window]`. No other logic changes — the per-topic
  latest-vs-previous-entry delta calculation, and the requirement that the
  *latest* entry falls within the cutoff, are unchanged.

## URL state

Two independent query params on `/dashboard`, separate from the existing
`range` param (which continues to control only the score trend chart):

- `topRange`: `"week" | "month"`, defaults to `"month"` when missing or not
  one of those two values.
- `improvedRange`: same type and default, independent of `topRange`.

Each section's data fetch reads only its own param — changing one never
affects the other.

## UI

One new shared client component, `components/dashboard/stat-window-toggle.tsx`,
taking the query-param name (`"topRange"` or `"improvedRange"`) and the
current value as props, used twice (once per section) rather than as two
near-duplicate files.

It renders a 2-button segmented toggle ("Week" / "Month"), styled with the
app's existing `Button` component (`variant="secondary"` for the unselected
button, `variant="primary"`/default for the selected one — exact visual
treatment to match existing segmented-control conventions if any exist in
the codebase, otherwise a simple two-button group with the active one
visually distinguished). Clicking a button updates that section's URL param
via `router.replace`, same pattern as `TrendRangeSelect`.

Placement: each toggle sits in its section's header, right-aligned, in the
same slot `TrendRangeSelect` occupies next to "Score trend":

```
Top performers                    [Week|Month]
Highest average score...
...list...

Most improved                     [Week|Month]
Biggest score gains...
...list...
```

## Copy changes

Each section's subtitle and empty state get reworded to reference the
selected window instead of being static:

- Top performers subtitle: "Highest average score in the last {week|month}."
  (replacing the current static "Highest average score across all recorded
  topics.")
- Top performers empty state: "No scores recorded in the last {week|month}."
  (replacing "No scores recorded yet.")
- Most improved subtitle: "Biggest score gains in the last {week|month}."
  (replacing the current hardcoded "last 30 days")
- Most improved empty state stays close to today's wording but references
  the window: "Worth a look once there are at least two scores on the same
  topic in the last {week|month}."

## Edge cases

- Invalid or missing `topRange`/`improvedRange` values fall back to
  `"month"`, no error thrown — same fallback convention as `range` and the
  students list's `sort` param elsewhere in this app.
- Switching a toggle is a server round-trip via URL param change (this is a
  server component page, like the rest of `/dashboard`), not a client-side
  re-fetch — consistent with how `range`/`TrendRangeSelect` already works.
- The two toggles are fully independent: viewing "Top performers (week)"
  next to "Most improved (month)" at the same time is expected and correct.

## Testing

Manual verification in the browser (no automated test suite in this repo):

1. Load `/dashboard` with no `topRange`/`improvedRange` params — confirm
   both sections default to "Month" selected and show month-scoped data.
2. Toggle "Top performers" to "Week" — confirm only that section's data and
   subtitle change; "Most improved" stays on "Month" and is unaffected.
3. Toggle "Most improved" to "Week" — confirm only that section's data and
   subtitle change.
4. Reload the page with both `?topRange=week&improvedRange=month` (or any
   combination) in the URL — confirm both toggles show the correct selected
   state and the data matches.
5. Confirm empty states render correctly (e.g. toggle to "Week" for a
   student data set where no scores were recorded in the last 7 days).
6. Confirm the existing "Score trend" chart and its `range` param are
   completely unaffected by either new toggle.
