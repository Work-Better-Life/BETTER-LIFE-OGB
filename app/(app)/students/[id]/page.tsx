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
import { StudentDateFilter } from "@/components/students/student-date-filter";

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ startDate?: string; endDate?: string; q?: string }>;
}) {
  const { id } = await params;
  const { startDate, endDate, q } = await searchParams;

  // Convert date strings (YYYY-MM-DD) to ISO for the data layer
  const startISO = startDate
    ? new Date(startDate + "T00:00:00Z").toISOString()
    : undefined;
  const endISO = endDate
    ? new Date(endDate + "T23:59:59.999Z").toISOString()
    : undefined;

  const [student, subjects] = await Promise.all([
    getStudentDetail(id, startISO, endISO),
    listSubjectsForPicker(),
  ]);

  if (!student) notFound();

  const allEntriesSorted = student.subjects
    .flatMap((s) => s.topics.flatMap((t) => t.entries))
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  const overallConsistency = consistencyScore(allEntriesSorted);

  const hasFilter = !!(startDate || endDate || q);

  let filteredSubjects = student.subjects;
  if (q) {
    const query = q.toLowerCase();
    filteredSubjects = student.subjects
      .map((subject) => ({
        ...subject,
        topics: subject.topics.filter((topic) =>
          topic.topicName.toLowerCase().includes(query)
        ),
      }))
      .filter((subject) => subject.topics.length > 0);
  }

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
        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-4 w-full sm:w-auto items-end sm:items-center">
          <StudentDateFilter
            studentId={student.id}
            startDate={startDate}
            endDate={endDate}
            q={q}
          />
          <div className="flex items-center gap-2">
            <AddScoreDrawer studentId={student.id} subjects={subjects} />
            <StudentHeaderActions student={student} />
          </div>
        </div>
      </div>

      {filteredSubjects.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-foreground-muted">
          {q ? (
            <p>No topics match &quot;{q}&quot;.</p>
          ) : hasFilter ? (
            <p>No scores recorded in this date range. Try adjusting your filters.</p>
          ) : (
            <p>No scores recorded yet. Add the first score to start tracking {student.firstName}&apos;s progress.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {filteredSubjects.map((subject) => (
            <section key={subject.subjectId} className="rounded-lg border border-border bg-surface p-6">
              <h2 className="font-display text-lg text-foreground">{subject.subjectName}</h2>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
