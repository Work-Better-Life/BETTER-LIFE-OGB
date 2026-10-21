import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { CLASS_LABELS, STATUS_LABELS, yesNoLabel } from "@/lib/student-profile";
import type { getProfile } from "@/lib/data/profiles";

type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function ageFromBirthDate(dateOfBirth: Date) {
  const now = new Date();
  let years = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dateOfBirth.getUTCMonth() ||
    (now.getUTCMonth() === dateOfBirth.getUTCMonth() && now.getUTCDate() < dateOfBirth.getUTCDate());
  if (beforeBirthday) years -= 1;
  return years;
}

function Fact({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-foreground-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">{children || "—"}</dd>
    </div>
  );
}

function LiteracyScale({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={cn("h-2 w-4 rounded-full", n <= value ? "bg-primary" : "bg-border")} />
        ))}
      </span>
      <span>{value} / 5</span>
    </span>
  );
}

// The eleven things worth seeing at a glance.
export function ProfileHighlights({
  studentId,
  profile,
  cohortName,
  canWrite,
}: {
  studentId: string;
  profile: Profile | null;
  cohortName: string | null;
  canWrite: boolean;
}) {
  if (!profile) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border p-4">
        <div>
          <p className="font-medium text-foreground">Profile incomplete</p>
          <p className="text-sm text-foreground-muted">
            {canWrite
              ? "Add this student's registration details — school, JAMB plans and guardian contact."
              : "No registration details have been added for this student yet."}
          </p>
          {cohortName && <p className="mt-1 text-sm text-foreground">Cohort: {cohortName}</p>}
        </div>
        {canWrite && (
          <Link
            href={`/students/${studentId}/profile/edit`}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-strong"
          >
            Add profile
          </Link>
        )}
      </div>
    );
  }

  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
      <Fact label="Gender">{profile.gender}</Fact>
      <Fact label="Age">{ageFromBirthDate(profile.dateOfBirth)} years</Fact>
      <Fact label="Current class">{CLASS_LABELS[profile.currentClass as keyof typeof CLASS_LABELS]}</Fact>
      <Fact label="Computer literacy">
        <LiteracyScale value={profile.computerComfort} />
      </Fact>
      <Fact label="Parent / guardian">{profile.guardianName}</Fact>
      <Fact label="Parent phone">
        <a href={`tel:${profile.guardianPhone}`} className="text-primary-strong hover:underline">
          {profile.guardianPhone}
        </a>
      </Fact>
      <Fact label="University of choice">{profile.university}</Fact>
      <Fact label="Course">{profile.course}</Fact>
      <Fact label="Date joined">{formatDate(profile.dateJoined)}</Fact>
      <Fact label="House address">{profile.houseAddress}</Fact>
      <Fact label="Cohort">{cohortName}</Fact>
    </dl>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h3 className="font-display text-base text-foreground">{title}</h3>
      <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

// Everything not already shown in the highlights.
export function ProfileMoreDetails({ profile }: { profile: Profile }) {
  return (
    <>
      <Group title="Personal & school">
        <Fact label="Date of birth">{formatDate(profile.dateOfBirth)}</Fact>
        <Fact label="School">{profile.schoolName}</Fact>
        <Fact label="School address / area">{profile.schoolAddress}</Fact>
        <Fact label="Core subjects">{profile.coreSubjects.join(", ")}</Fact>
        <Fact label="Struggles with">{profile.strugglingSubjects.join(", ")}</Fact>
      </Group>

      <Group title="Exam readiness">
        <Fact label="JAMB year">{profile.jambYear}</Fact>
        <Fact label="Target score">{profile.jambTargetScore}</Fact>
        <Fact label="Has written a CBT">{yesNoLabel(profile.hasTakenCbt)}</Fact>
        <Fact label="Previous extra lessons">{yesNoLabel(profile.attendedExtraLessons)}</Fact>
        <Fact label="Strict CBT conditions">{yesNoLabel(profile.strictCbtWilling)}</Fact>
        <Fact label="Follow-up classes">{yesNoLabel(profile.followUpWilling)}</Fact>
        <Fact label="Mock exam commitment">{yesNoLabel(profile.mocksCommitment)}</Fact>
        <Fact label="Biggest challenge">{profile.biggestChallenge}</Fact>
        <div className="sm:col-span-2">
          <Fact label="Why they joined">{profile.motivation}</Fact>
        </div>
      </Group>

      <Group title="Parent / guardian">
        <Fact label="Address">{profile.guardianAddress}</Fact>
        <Fact label="Email">{profile.guardianEmail}</Fact>
        <Fact label="Supports participation">{yesNoLabel(profile.guardianSupports)}</Fact>
        <Fact label="Data consent">{yesNoLabel(profile.dataConsent)}</Fact>
      </Group>

      <Group title="Programme">
        <Fact label="Additional info">{profile.additionalInfo}</Fact>
      </Group>
    </>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status;
  return (
    <Badge variant={status === "admitted" ? "primary" : status === "dropped_out" ? "danger" : "neutral"}>{label}</Badge>
  );
}
