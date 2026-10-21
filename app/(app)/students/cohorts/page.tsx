import { requireSession } from "@/lib/auth";
import { listCohorts } from "@/lib/data/cohorts";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CohortsManager } from "@/components/cohorts/cohorts-manager";

export default async function CohortsPage() {
  const session = await requireSession();
  const cohorts = await listCohorts();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Students", href: "/students" }, { label: "Cohorts" }]} />
        <h1 className="mt-2 font-display text-2xl text-foreground">Cohorts</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Groups of students, like the 2026 intake. A student belongs to at most one cohort.
        </p>
      </div>
      <CohortsManager cohorts={cohorts} canWrite={session.canWrite} />
    </div>
  );
}
