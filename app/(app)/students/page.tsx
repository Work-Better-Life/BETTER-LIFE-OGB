import { Suspense } from "react";
import Link from "next/link";
import { listStudents } from "@/lib/data/students";
import { listCohorts } from "@/lib/data/cohorts";
import { CohortFilter } from "@/components/students/cohort-filter";
import { requireSession } from "@/lib/auth";
import { StudentsTable } from "@/components/students/students-table";
import { SearchBox } from "@/components/students/search-box";
import { SortSelect } from "@/components/students/sort-select";
import { Pagination } from "@/components/students/pagination";
import { ExportCsvMenu } from "@/components/students/export-csv-menu";

const PAGE_SIZE = 10;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; sort?: string; cohort?: string }>;
}) {
  const session = await requireSession();
  const { search, page: pageParam, sort, cohort } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const [{ students, total }, cohorts] = await Promise.all([
    listStudents(search, page, PAGE_SIZE, sort, cohort),
    listCohorts(),
  ]);

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
            <Suspense fallback={null}>
              <ExportCsvMenu />
            </Suspense>
            <Link
              href="/students/cohorts"
              className="inline-flex h-10 items-center rounded-md border border-border bg-surface-muted px-4 text-sm font-medium text-foreground hover:bg-border/60"
            >
              Cohorts
            </Link>
            {session.canWrite && (
              <Link
                href="/students/import"
                className="inline-flex h-10 items-center rounded-md border border-border bg-surface-muted px-4 text-sm font-medium text-foreground hover:bg-border/60"
              >
                Import
              </Link>
            )}
          </div>
          <div className="flex w-full items-center gap-2">
            <Suspense fallback={<div className="h-10 flex-1" />}>
              <CohortFilter cohorts={cohorts} className="flex-1" />
            </Suspense>
            <Suspense fallback={<div className="h-10 flex-1" />}>
              <SortSelect className="flex-1" />
            </Suspense>
          </div>
        </div>
      </div>

      <StudentsTable students={students} cohorts={cohorts} canWrite={session.canWrite} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
