import { Suspense } from "react";
import { listStudents } from "@/lib/data/students";
import { StudentsTable } from "@/components/students/students-table";
import { SearchBox } from "@/components/students/search-box";
import { SortSelect } from "@/components/students/sort-select";
import { Pagination } from "@/components/students/pagination";
import { ExportCsvMenu } from "@/components/students/export-csv-menu";

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
            <ExportCsvMenu />
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
