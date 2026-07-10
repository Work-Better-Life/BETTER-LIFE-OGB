import { listSubjectsWithTopics } from "@/lib/data/subjects";
import { SubjectsManager } from "@/components/subjects/subjects-manager";

export default async function SubjectsPage() {
  const subjects = await listSubjectsWithTopics();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">Subjects</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          The catalog of subjects and topics students can be scored on.
        </p>
      </div>
      <SubjectsManager subjects={subjects} />
    </div>
  );
}
