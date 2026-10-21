import { requireWriterPage } from "@/lib/auth";
import { listCohorts } from "@/lib/data/cohorts";
import { listStudentImports } from "@/lib/data/profile-import";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ImportForm } from "@/components/students/import-form";
import { RecentStudentImports } from "@/components/students/recent-student-imports";

export default async function ImportStudentsPage() {
  await requireWriterPage();
  const [cohorts, imports] = await Promise.all([listCohorts(), listStudentImports()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Students", href: "/students" }, { label: "Import" }]} />
        <h1 className="mt-2 font-display text-2xl text-foreground">Import students</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Creates a student and profile for each registration. Anyone already in the app (same name and date of birth)
          is left alone. Every problem is listed first, and nothing is saved until the file is clean.
        </p>
        <p className="mt-2 text-sm text-foreground-muted">
          Start from the template so the column headings match:{" "}
          <a href="/api/templates/students" className="text-primary-strong hover:underline">
            CSV
          </a>
          {" · "}
          <a href="/api/templates/students?format=xlsx" className="text-primary-strong hover:underline">
            Excel
          </a>
        </p>
      </div>
      <ImportForm cohorts={cohorts} />
      <RecentStudentImports imports={imports} />
    </div>
  );
}
