import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getStudentNeighbors } from "@/lib/data/students";
import { requireSession } from "@/lib/auth";
import { getProfile } from "@/lib/data/profiles";
import { getPhoto } from "@/lib/data/photos";
import { listAttendance } from "@/lib/data/attendance";
import { summariseAttendance } from "@/lib/attendance";
import { STUDENT_OVERVIEW_RANGES, rangeStartISO, type StudentOverviewRange } from "@/lib/trend-ranges";
import { Badge } from "@/components/ui/badge";
import { ProfileHighlights, ProfileMoreDetails, StatusBadge } from "@/components/students/profile-card";
import { ExpandableDetails } from "@/components/students/expandable-details";
import { StudentPager } from "@/components/students/student-pager";
import { PhotoUploader } from "@/components/students/photo-uploader";
import { StudentAvatar } from "@/components/students/student-avatar";
import { AttendanceBadge } from "@/components/students/attendance-badge";
import { AttendancePeriodSelect } from "@/components/students/attendance-period-select";

function parsePeriod(value: string | undefined): StudentOverviewRange {
  return value && value in STUDENT_OVERVIEW_RANGES ? (value as StudentOverviewRange) : "all";
}

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const period = parsePeriod((await searchParams).period);
  const student = await prisma.student.findUnique({ where: { id }, include: { cohort: true } });
  if (!student) notFound();
  const [profile, photo, neighbors, attendanceRecords] = await Promise.all([
    getProfile(id),
    getPhoto(id),
    getStudentNeighbors(id),
    listAttendance(id),
  ]);
  // Attendance over the chosen period (All time, 30 days, 3 months…).
  const periodStart = rangeStartISO(period);
  const attendanceSummary = summariseAttendance(attendanceRecords, periodStart ? new Date(periodStart) : undefined);
  const cohort = student.cohort;
  const fullName = `${student.firstName} ${student.lastName}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            { label: "Students", href: "/students" },
            { label: fullName, href: `/students/${id}` },
            { label: "Profile" },
          ]}
        />
        <StudentPager previous={neighbors.previous} next={neighbors.next} suffix="/profile" />
      </div>

      <section className="flex flex-col gap-6 rounded-lg border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          {session.canWrite ? (
            <PhotoUploader studentId={id} name={fullName} photo={photo} />
          ) : (
            <StudentAvatar photo={photo} name={fullName} />
          )}
          <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-3 text-center sm:items-start sm:text-left">
            <div className="flex w-full flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl text-foreground">{fullName}</h1>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <Badge>{student.serialNumber}</Badge>
                  {profile && <StatusBadge status={profile.status} />}
                  <AttendanceBadge
                    summary={attendanceSummary}
                    hasAnyRecords={attendanceRecords.length > 0}
                    periodLabel={STUDENT_OVERVIEW_RANGES[period].label.toLowerCase()}
                  />
                  {attendanceRecords.length > 0 && <AttendancePeriodSelect studentId={id} value={period} />}
                </div>
              </div>
              {profile && session.canWrite && (
                <Link
                  href={`/students/${id}/profile/edit`}
                  className="inline-flex h-10 items-center rounded-md border border-border bg-surface-muted px-4 text-sm font-medium text-foreground hover:bg-border/60"
                >
                  Edit profile
                </Link>
              )}
            </div>
          </div>
        </div>

        <ProfileHighlights
          studentId={id}
          profile={profile}
          cohortName={cohort?.name ?? null}
          canWrite={session.canWrite}
        />
      </section>

      {profile && (
        <ExpandableDetails>
          <ProfileMoreDetails profile={profile} />
        </ExpandableDetails>
      )}
    </div>
  );
}
