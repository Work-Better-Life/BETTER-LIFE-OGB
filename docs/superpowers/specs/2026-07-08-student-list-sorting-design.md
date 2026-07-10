# Student list sorting/filter design

## Problem

The students list (`/students`) is hard-coded to sort newest-added-first
(`createdAt: "desc"`). The teacher wants the default to be oldest-added-first,
and a way to switch between a few useful orderings without losing the
existing search behavior.

## Sort options

A `sort` URL query param (parallel to the existing `search` param) drives the
order. Values:

| `sort` value | Label            | Ordering                                                  |
| ------------ | ---------------- | ---------------------------------------------------------- |
| `oldest` (default) | Oldest added | `createdAt` ascending |
| `newest`     | Newest added     | `createdAt` descending |
| `scored`     | Recently scored  | by each student's most recent score date, descending |
| `name`       | Name A–Z         | `firstName` ascending, then `lastName` ascending |

An unrecognized or missing `sort` value falls back to `oldest`.

**Recently scored, no-score students:** students with zero recorded scores
have no date to sort by. They always sort to the end of the list, regardless
of sort direction elsewhere, ordered among themselves by `createdAt` ascending.

## Data layer

`lib/data/students.ts`: `listStudents(search?: string, sort?: string)`.

- `oldest`, `newest`, and `name` map directly to a Prisma `orderBy` clause
  (`createdAt: "asc"`, `createdAt: "desc"`, and
  `[{ firstName: "asc" }, { lastName: "asc" }]` respectively).
- `scored` cannot be expressed as a Prisma `orderBy` because it depends on
  `lastRecordedAt`, a value computed after the query from the included
  `scores` relation. For this case, query with the default (`createdAt: "asc"`)
  order, build the existing per-student result objects as today, then sort
  that array in JS: students with a non-null `lastRecordedAt` first (by that
  date, descending), followed by students with `lastRecordedAt === null`
  (by `createdAt` ascending).

`listStudentsForPicker` is unaffected.

## UI

New client component `components/students/sort-select.tsx`, modeled on the
existing `SearchBox` (`components/students/search-box.tsx`):

- Reads the current value from `useSearchParams().get("sort")`, defaulting
  the displayed selection to `oldest`.
- On change, writes the new value into the URL via
  `router.replace(`/students?${params}`)`, same pattern as `SearchBox`
  (preserves the `search` param, no debounce needed since it's a discrete
  choice).
- Rendered as a native `<select>` with the same visual treatment as
  `Input` (border, radius, focus ring) — no new generic `ui/select.tsx`
  primitive, since nothing else needs one yet.

### Layout

In `app/(app)/students/page.tsx`, the header's right-hand side changes from a
single row to two rows: Search + Export CSV on top, and the sort dropdown on
its own full-width row directly beneath both of them, right-aligned. The
`StudentsTable`'s existing "New Student" row (rendered inside that component)
is unaffected and stays below.

```
[ Search box ]  [Export CSV]
[         Sort: Oldest added ]
                                [New Student]
```

## Error handling / edge cases

- Invalid `sort` value in the URL → treated as `oldest`, no error thrown.
- Empty student list → existing "No students yet" empty state is unaffected
  by sort/search selection.
- Ties within `scored` (same last-recorded date) or `oldest`/`newest`
  (same `createdAt`) are left in whatever stable order Prisma/JS produce;
  no explicit tiebreaker needed for this dataset size.

## Testing

Manual verification in the browser (no automated UI tests in this codebase
today):

1. Load `/students` with no `sort` param — confirm oldest-added-first order.
2. Switch to each of Newest added, Recently scored, Name A–Z — confirm order
   changes as expected, including that unscored students land at the bottom
   under "Recently scored".
3. Combine an active `search` term with each sort option — confirm both
   filters apply together.
4. Reload the page after selecting a sort option — confirm the URL
   (`?sort=...`) preserves the selection.
5. Confirm the empty state still renders when a search matches no students,
   regardless of the selected sort.
