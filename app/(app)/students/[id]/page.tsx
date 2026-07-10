import { notFound } from "next/navigation";
import Link from "next/link";
import { getStudentDetail } from "@/lib/data/students";
import { listSubjectsForPicker } from "@/lib/data/subjects";
import { latestDelta, consistencyScore } from "@/lib/scoring";
import { ConsistencyBadge } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { TopicCard } from "@/components/students/topic-card";
import { AddScoreDrawer } from "@/components/students/add-score-drawer";
import { StudentHeaderActions } from "@/components/students/student-header-actions";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [student, subjects] = await Promise.all([getStudentDetail(id), listSubjectsForPicker()]);

  if (!student) notFound();

  const allEntriesSorted = student.subjects
    .flatMap((s) => s.topics.flatMap((t) => t.entries))
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  const overallConsistency = consistencyScore(allEntriesSorted);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/students" className="text-sm text-foreground-muted hover:underline">
          ← Students
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-foreground">
            {student.firstName} {student.lastName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{student.serialNumber}</Badge>
            {student.averagePercentage !== null && (
              <Badge variant="primary">{student.averagePercentage.toFixed(1)}% average</Badge>
            )}
            <ConsistencyBadge score={overallConsistency} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AddScoreDrawer studentId={student.id} subjects={subjects} />
          <StudentHeaderActions student={student} />
        </div>
      </div>

      {student.subjects.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-foreground-muted">
          No scores recorded yet. Add the first score to start tracking {student.firstName}&apos;s progress.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {student.subjects.map((subject) => (
            <section key={subject.subjectId} className="rounded-lg border border-border bg-surface p-6">
              <h2 className="font-display text-lg text-foreground">{subject.subjectName}</h2>
              <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
                {subject.topics.map((topic) => (
                  <TopicCard
                    key={topic.topicId}
                    studentId={student.id}
                    topicName={topic.topicName}
                    entries={topic.entries}
                    delta={latestDelta(topic.entries)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
