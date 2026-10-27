import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import Link from "next/link";
import { getStudentDetail, getStudentNeighbors } from "@/lib/data/students";
import { requireSession } from "@/lib/auth";
import { listCohorts } from "@/lib/data/cohorts";
import { listAttendance } from "@/lib/data/attendance";
import { summariseAttendance } from "@/lib/attendance";
import { AttendanceBadge } from "@/components/students/attendance-badge";
import { listSubjectsForPicker } from "@/lib/data/subjects";
import { consistencyScore } from "@/lib/scoring";
import { ConsistencyBadge } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { AddScoreDrawer } from "@/components/students/add-score-drawer";
import { StudentHeaderActions } from "@/components/students/student-header-actions";
import { StudentPager } from "@/components/students/student-pager";
import { StudentOverview } from "@/components/students/student-overview";
import { buildTrendPoints } from "@/lib/trend-points";
import { STUDENT_OVERVIEW_RANGES, rangeStartISO, type StudentOverviewRange } from "@/lib/trend-ranges";

function parseRange(value: string | undefined): StudentOverviewRange {
  return value && value in STUDENT_OVERVIEW_RANGES ? (value as StudentOverviewRange) : "all";
}

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const { range: rangeParam } = await searchParams;
  const range = parseRange(rangeParam);
  const startISO = rangeStartISO(range);

  const [student, subjects, neighbors, cohorts, attendanceRecords] = await Promise.all([
    getStudentDetail(id, startISO),
    listSubjectsForPicker(),
    getStudentNeighbors(id),
    listCohorts(),
    listAttendance(id),
  ]);

  if (!student) notFound();

  const allEntriesSorted = [...student.rawScores].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  const overallConsistency = consistencyScore(allEntriesSorted);
  // Attendance uses the same period as the chart (All time, 30 days, 3 months…).
  const attendanceSummary = summariseAttendance(attendanceRecords, startISO ? new Date(startISO) : undefined);

  const trendPoints = buildTrendPoints(student.rawScores);
  const comparisonSubjects = student.subjects.map((subject) => ({
    id: subject.subjectId,
    name: subject.subjectName,
    entries: subject.topics.flatMap((topic) =>
      topic.entries.map((entry) => ({ value: entry.value, maxScore: entry.maxScore, recordedAt: entry.recordedAt }))
    ),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            { label: "Students", href: "/students" },
            { label: `${student.firstName} ${student.lastName}` },
          ]}
        />
        <StudentPager previous={neighbors.previous} next={neighbors.next} />
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
            <AttendanceBadge
              summary={attendanceSummary}
              hasAnyRecords={attendanceRecords.length > 0}
              periodLabel={STUDENT_OVERVIEW_RANGES[range].label.toLowerCase()}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/students/${student.id}/profile`}
            className="inline-flex h-10 items-center rounded-md border border-border bg-surface-muted px-4 text-sm font-medium text-foreground hover:bg-border/60"
          >
            View profile
          </Link>
          {session.canWrite && (
            <>
              <AddScoreDrawer studentId={student.id} subjects={subjects} />
              <StudentHeaderActions student={student} cohorts={cohorts} />
            </>
          )}
        </div>
      </div>

      <StudentOverview
        studentId={student.id}
        studentFirstName={student.firstName}
        range={range}
        points={trendPoints}
        subjects={comparisonSubjects}
      />
    </div>
  );
}
