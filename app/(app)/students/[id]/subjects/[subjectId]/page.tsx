import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { notFound } from "next/navigation";
import { getStudentDetail } from "@/lib/data/students";
import { requireSession } from "@/lib/auth";
import { Badge, ConsistencyBadge } from "@/components/ui/badge";
import { SubjectExplorer } from "@/components/students/subject-explorer";
import { averagePercentage, consistencyScore } from "@/lib/scoring";

export default async function StudentSubjectPage({
  params,
}: {
  params: Promise<{ id: string; subjectId: string }>;
}) {
  const session = await requireSession();
  const { id, subjectId } = await params;
  const student = await getStudentDetail(id);
  if (!student) notFound();

  const subject = student.subjects.find((s) => s.subjectId === subjectId);
  if (!subject) notFound();

  const topics = subject.topics.map((t) => ({
    id: t.topicId,
    name: t.topicName,
    entries: t.entries.map((e) => ({ id: e.id, value: e.value, maxScore: e.maxScore, note: e.note, recordedAt: e.recordedAt })),
  }));

  const allEntries = topics.flatMap((t) => t.entries);
  const average = averagePercentage(allEntries);
  const consistency = consistencyScore([...allEntries].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime()));

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Students", href: "/students" },
          { label: `${student.firstName} ${student.lastName}`, href: `/students/${student.id}` },
          { label: subject.subjectName },
        ]}
      />

      <div>
        <h1 className="font-display text-2xl text-foreground">{subject.subjectName}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {average !== null && <Badge variant="primary">{average.toFixed(1)}% average</Badge>}
          <ConsistencyBadge score={consistency} />
          <Badge>{topics.length} topics</Badge>
        </div>
      </div>

      <SubjectExplorer studentId={student.id} topics={topics} canWrite={session.canWrite} />
    </div>
  );
}
