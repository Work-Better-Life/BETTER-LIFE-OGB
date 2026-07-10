# Student List Sorting/Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the students list's default order to oldest-added-first, and add a sort dropdown (Oldest added / Newest added / Recently scored / Name A–Z) below the search + export row.

**Architecture:** A `sort` URL query param (parallel to the existing `search` and `page` params) is read server-side in `app/(app)/students/page.tsx` and passed to `listStudents` in `lib/data/students.ts`, which maps it to a Prisma `orderBy` clause for three of the four values and to a post-query JS sort for the fourth (`scored`, since it depends on a value computed from the included `scores` relation). A new client component `components/students/sort-select.tsx`, modeled on the existing `SearchBox`, renders the control and writes the chosen value back into the URL.

**Correction (post-plan discovery):** `listStudents` already supports pagination (`listStudents(search, page, pageSize)` returning `{ students, total }`, with a `Pagination` component and `app/api/export/students/route.ts` both depending on that shape) — this wasn't known when the plan was first drafted. Task 1 below is revised to add `sort` as a fourth parameter alongside pagination rather than replacing the paginated signature. `oldest`/`newest`/`name` page at the database level (`skip`/`take`); `scored` can't be expressed as a DB `orderBy`, so it fetches every matching student, sorts in JS, then slices out the requested page. When `pageSize` is omitted entirely (the CSV export's call site), the function fetches and sorts everything with no slicing — same behavior export already relied on.

**Tech Stack:** Next.js App Router (server components + `"use client"` components), Prisma (SQLite), no test runner is configured in this repo — verification is via `npx tsc --noEmit`, `npm run lint`, and manual browser checks against the dev server.

**No automated test framework:** This repo has no Jest/Vitest/etc. (checked `package.json`). Do not add one for this feature — follow the existing project convention of manual/browser verification. Each task below has explicit manual verification steps instead of automated test steps.

---

### Task 1: Add sort support to `listStudents` (alongside existing pagination)

**Files:**
- Modify: `lib/data/students.ts` (the `listStudents` function, and the two helpers it's split into below)

**Current signature (before this task):** `listStudents(search?: string, page?: number, pageSize?: number)` → `Promise<{ students: StudentRow[]; total: number }>`. Two existing call sites depend on this: `app/(app)/students/page.tsx` calls it as `listStudents(search, page, PAGE_SIZE)`, and `app/api/export/students/route.ts` calls it as `listStudents(search)` (page/pageSize omitted — this must keep returning **every** matching student, unpaginated, since it's used for CSV export). Do not change either call site in this task — that's Task 3's job for `page.tsx`; the export route needs no changes at all, since its call already omits the now-added trailing `sort` parameter and optional params default safely.

- [ ] **Step 1: Replace the `listStudents` function and add its helpers**

Find the current `listStudents` function in `lib/data/students.ts` and replace it (and nothing else in the file) with the following. This adds two private helpers (`mapStudentRow`, `sortStudentRows`) plus the exported `StudentSort` type, `normalizeSort`, and the revised `listStudents`:

```ts
export type StudentSort = "oldest" | "newest" | "scored" | "name";

const VALID_SORTS: readonly StudentSort[] = ["oldest", "newest", "scored", "name"];

function normalizeSort(sort?: string): StudentSort {
  return VALID_SORTS.includes(sort as StudentSort) ? (sort as StudentSort) : "oldest";
}

type RawStudentWithScores = Awaited<ReturnType<typeof prisma.student.findFirstOrThrow<{
  include: {
    scores: { include: { topic: { include: { subject: true } } } };
  };
}>>>;

function mapStudentRow(student: RawStudentWithScores) {
  const subjectNames = new Set(student.scores.map((s) => s.topic.subject.name));
  const lastEntry = student.scores.at(-1);
  return {
    id: student.id,
    serialNumber: student.serialNumber,
    firstName: student.firstName,
    lastName: student.lastName,
    createdAt: student.createdAt,
    subjectNames: Array.from(subjectNames),
    averagePercentage: averagePercentage(student.scores),
    lastRecordedAt: lastEntry?.recordedAt ?? null,
  };
}

type StudentRow = ReturnType<typeof mapStudentRow>;

function sortStudentRows(rows: StudentRow[], sort: StudentSort): StudentRow[] {
  if (sort === "scored") {
    return [...rows].sort((a, b) => {
      if (a.lastRecordedAt && b.lastRecordedAt) {
        return b.lastRecordedAt.getTime() - a.lastRecordedAt.getTime();
      }
      if (a.lastRecordedAt) return -1;
      if (b.lastRecordedAt) return 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }
  if (sort === "newest") {
    return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  if (sort === "name") {
    return [...rows].sort(
      (a, b) => a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName)
    );
  }
  return [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

const scoresInclude = {
  scores: {
    include: { topic: { include: { subject: true } } },
    orderBy: { recordedAt: "asc" as const },
  },
};

export async function listStudents(search?: string, page?: number, pageSize?: number, sort?: string) {
  const normalizedSort = normalizeSort(sort);
  const where = search
    ? {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { serialNumber: { contains: search } },
        ],
      }
    : undefined;

  // "scored" can't be paginated at the database level — it sorts on a value
  // computed after fetching (lastRecordedAt). An omitted pageSize means
  // "return everything" (the CSV export's call site). Both cases fetch every
  // matching student, sort in JS, then slice out the requested page (if any).
  if (normalizedSort === "scored" || pageSize === undefined) {
    const students = await prisma.student.findMany({ where, include: scoresInclude });
    const sorted = sortStudentRows(students.map(mapStudentRow), normalizedSort);
    const total = sorted.length;

    if (pageSize === undefined) {
      return { students: sorted, total };
    }

    const currentPage = Math.max(1, page ?? 1);
    const start = (currentPage - 1) * pageSize;
    return { students: sorted.slice(start, start + pageSize), total };
  }

  // oldest / newest / name: page at the database level.
  const currentPage = Math.max(1, page ?? 1);
  const orderBy =
    normalizedSort === "newest"
      ? { createdAt: "desc" as const }
      : normalizedSort === "name"
        ? [{ firstName: "asc" as const }, { lastName: "asc" as const }]
        : { createdAt: "asc" as const };

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: scoresInclude,
      orderBy,
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { students: students.map(mapStudentRow), total };
}
```

Notes:
- `RawStudentWithScores` derives the Prisma result type generically so the helper doesn't need a hand-maintained duplicate of the `include` shape. If `prisma.student.findFirstOrThrow` isn't available on the generated client in this Prisma version (check by running the type-check in Step 2 — if that specific line errors, e.g. this Prisma version doesn't expose `findFirstOrThrow` as a strongly-typed generic on the client the same way), fall back to typing the parameter as `Awaited<ReturnType<typeof prisma.student.findMany<{ where?: typeof where; include: typeof scoresInclude }>>>[number]` instead, or just inline the object shape as a local `type` with the same fields as `scoresInclude` implies (`scores: { recordedAt: Date; topic: { subject: { name: string } } }[]` plus the base `Student` scalar fields). Don't spend more than a couple of minutes on this — any of the three approaches is fine, the goal is just to avoid `any`.
- Defaults to `oldest` (`createdAt` ascending) for any missing/unrecognized `sort` value — this is the new default order (previously the file defaulted to `createdAt: "desc"`, newest-first).
- `StudentRow` here is a local type inferred from `mapStudentRow`'s return value — it's not exported, and it's unrelated to (structurally compatible with, but separate from) the `StudentRow` type already defined in `components/students/students-table.tsx`. Don't try to unify them; that file's type isn't imported here today, and this task doesn't need to change that.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. If the `RawStudentWithScores` line errors, apply one of the fallbacks noted above and re-run.

- [ ] **Step 3: Manual verification via a temporary script**

Run: `npx tsx -e "import('./lib/data/students.ts').then(async (m) => { console.log((await m.listStudents(undefined, undefined, undefined, 'oldest')).students.map(s => s.firstName)); console.log((await m.listStudents(undefined, undefined, undefined, 'newest')).students.map(s => s.firstName)); console.log((await m.listStudents(undefined, undefined, undefined, 'name')).students.map(s => s.firstName)); console.log((await m.listStudents(undefined, undefined, undefined, 'scored')).students.map(s => [s.firstName, s.lastRecordedAt])); console.log((await m.listStudents(undefined, 1, 2, 'oldest')).students.map(s => s.firstName)); })"`

Expected: five printed arrays — `oldest` and `newest` (both unpaginated, since `pageSize` is `undefined`) should be exact reverses of each other by add order, `name` alphabetical, `scored` showing scored students first (descending date) then unscored students at the end, and the last line (`page=1, pageSize=2, sort=oldest`) should show exactly the first 2 entries of the first `oldest` array. (If this repo's tsx/ts-node setup can't run a bare `import()` like this against a `.ts` module outside the Next.js runtime, run the equivalent check informally through Task 3's browser verification instead — this step is a sanity check, not a blocker.)

- [ ] **Step 4: Commit**

```bash
git add lib/data/students.ts
git commit -m "feat: add sort options to listStudents alongside pagination"
```

---

### Task 2: Add the `SortSelect` component

**Files:**
- Create: `components/students/sort-select.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

const SORT_OPTIONS = [
  { value: "oldest", label: "Oldest added" },
  { value: "newest", label: "Newest added" },
  { value: "scored", label: "Recently scored" },
  { value: "name", label: "Name A–Z" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const SORT_VALUES: readonly string[] = SORT_OPTIONS.map((option) => option.value);

export function SortSelect({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawSort = searchParams.get("sort");
  const sort: SortValue = SORT_VALUES.includes(rawSort ?? "") ? (rawSort as SortValue) : "oldest";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams);
    if (e.target.value === "oldest") params.delete("sort");
    else params.set("sort", e.target.value);
    router.replace(`/students?${params.toString()}`);
  }

  return (
    <select
      value={sort}
      onChange={handleChange}
      aria-label="Sort students"
      className={cn(
        "h-10 rounded-md border border-border bg-surface px-3 text-sm text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
        className
      )}
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
```

This mirrors `components/students/search-box.tsx`'s pattern of reading/writing the URL via `useSearchParams`/`router.replace`, but applies the change immediately on `onChange` (no debounce needed for a discrete select).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/students/sort-select.tsx
git commit -m "feat: add SortSelect component"
```

---

### Task 3: Wire `SortSelect` into the students page

**Files:**
- Modify: `app/(app)/students/page.tsx`

**Note:** this file already has pagination (`page` param, `Pagination` component, `PAGE_SIZE` constant) from prior work not covered by the original version of this plan. Keep all of that — this task only adds the `sort` param and the `SortSelect` control alongside it.

- [ ] **Step 1: Replace the file contents**

```tsx
import { Suspense } from "react";
import { listStudents } from "@/lib/data/students";
import { StudentsTable } from "@/components/students/students-table";
import { SearchBox } from "@/components/students/search-box";
import { SortSelect } from "@/components/students/sort-select";
import { Pagination } from "@/components/students/pagination";

const PAGE_SIZE = 10;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; sort?: string }>;
}) {
  const { search, page: pageParam, sort } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const { students, total } = await listStudents(search, page, PAGE_SIZE, sort);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-foreground">Students</h1>
          <p className="mt-1 text-sm text-foreground-muted">{total} students</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            <Suspense fallback={<div className="h-10 w-64" />}>
              <SearchBox />
            </Suspense>
            <a
              href="/api/export/students"
              className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-border bg-surface-muted px-3 text-[13px] font-medium text-foreground transition-colors duration-150 hover:bg-border/60 active:scale-[0.97]"
            >
              Export CSV
            </a>
          </div>
          <Suspense fallback={<div className="h-10 w-full" />}>
            <SortSelect className="w-full" />
          </Suspense>
        </div>
      </div>

      <StudentsTable students={students} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
```

Changes from the current file: `searchParams` type gains `sort?: string`; `listStudents` is called with `sort` as a fourth argument (pagination args unchanged); the header row changes from `items-center` to `items-start` (to align the top of the title with the now-taller right column); the right-hand side becomes a `flex-col` with the Search+Export row on top and `SortSelect` (stretched to `w-full` via its `className` prop) on its own row beneath, wrapped in its own `Suspense` boundary since it also calls `useSearchParams`. The `Pagination` component and `PAGE_SIZE` constant are untouched — sorting doesn't change the total count, so a change of `sort` alone can never push `page` out of range the way a narrowing `search` already can (a pre-existing, out-of-scope behavior).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual browser verification**

Run: `npm run dev`, then in a browser visit `/students` and:
1. Confirm the list loads with the oldest-added student first (no `sort` param in the URL).
2. Open the sort dropdown, select "Newest added" — confirm the URL gains `?sort=newest` and the order reverses.
3. Select "Recently scored" — confirm students with score entries appear first (most recent first) and students with no scores appear at the bottom.
4. Select "Name A–Z" — confirm alphabetical order by first name.
5. Select "Oldest added" again — confirm the `sort` param is removed from the URL (falls back to default) and order returns to oldest-first.
6. Type into the search box while a non-default sort is selected — confirm both the filter and the sort persist together.
7. Reload the page while `?sort=scored` (or any non-default value) is in the URL — confirm the dropdown shows the correct selection and the list order matches.
8. Confirm the "No students yet" empty state still renders correctly if you filter to a search term with no matches, regardless of the selected sort.
9. With more than `PAGE_SIZE` (10) students, navigate to page 2, then change the sort — confirm the page number stays valid and shows a different set of students consistent with the new order (not a duplicate of page 1, not an empty page).
10. Visit `/api/export/students` directly (with and without a `?search=` query) — confirm the CSV download still contains every matching student (not just one page's worth).

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/students/page.tsx"
git commit -m "feat: add sort dropdown to students page"
```

---

## Self-Review Notes

- **Spec coverage:** default oldest-first order (Task 1), all four sort values incl. unscored-students-last rule (Task 1), `SortSelect` component + URL persistence (Task 2), layout placement under Search+Export row (Task 3), invalid `sort` fallback (Task 1's `normalizeSort`) — all covered.
- **Type consistency:** `StudentSort` type and its four literal values (`"oldest" | "newest" | "scored" | "name"`) are defined once in `lib/data/students.ts` (Task 1) and independently mirrored as `SortValue` in `sort-select.tsx` (Task 2) — the two files don't share an import today (`lib/data/students.ts` isn't importable from a client component), so the value list is intentionally duplicated in both places; if a third consumer needs these values, extract a shared constant then.
- **No placeholders:** every step shows complete code or an exact command with expected output.
