import Link from "next/link";
import { listSubjectsForPicker } from "@/lib/data/subjects";
import { listStudentsForPicker } from "@/lib/data/students";
import { RecordTabs } from "@/components/scores/record-tabs";

export default async function RecordTestPage() {
  const [subjects, students] = await Promise.all([listSubjectsForPicker(), listStudentsForPicker()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard" className="text-sm text-foreground-muted hover:underline">
          ← Dashboard
        </Link>
        <h1 className="font-display mt-2 text-2xl text-foreground">Record a test</h1>
      </div>

      {subjects.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-foreground-muted">
          Add a subject and topic from the{" "}
          <Link href="/subjects" className="text-primary-strong hover:underline">
            Subjects page
          </Link>{" "}
          before recording a test.
        </div>
      ) : (
        <RecordTabs subjects={subjects} students={students} />
      )}
    </div>
  );
}
