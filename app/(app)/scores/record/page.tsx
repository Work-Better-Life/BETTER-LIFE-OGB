import Link from "next/link";
import { listSubjectsForPicker } from "@/lib/data/subjects";
import { listStudentsForPicker } from "@/lib/data/students";
import { BulkScoreForm } from "@/components/scores/bulk-score-form";

export default async function RecordTestPage() {
  const [subjects, students] = await Promise.all([listSubjectsForPicker(), listStudentsForPicker()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard" className="text-sm text-foreground-muted hover:underline">
          ← Dashboard
        </Link>
        <h1 className="font-display mt-2 text-2xl text-foreground">Record a test</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Pick the subject and topic once, then enter each student&apos;s score in one pass.
        </p>
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
        <BulkScoreForm subjects={subjects} students={students} />
      )}
    </div>
  );
}
