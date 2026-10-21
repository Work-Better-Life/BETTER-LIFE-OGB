import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { prisma } from "@/lib/db";
import { requireWriterPage } from "@/lib/auth";
import { getProfile } from "@/lib/data/profiles";
import { ProfileForm, EMPTY_PROFILE_VALUES, type ProfileFormValues } from "@/components/students/profile-form";
import { dateToInput } from "@/lib/student-profile";

function yesNo(value: boolean | null) {
  return value === null ? "" : value ? "yes" : "no";
}

export default async function EditStudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireWriterPage();
  const { id } = await params;
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) notFound();
  const profile = await getProfile(id);

  const initialValues: ProfileFormValues = profile
    ? {
        gender: profile.gender,
        dateOfBirth: dateToInput(profile.dateOfBirth),
        houseAddress: profile.houseAddress ?? "",
        schoolName: profile.schoolName,
        schoolAddress: profile.schoolAddress,
        currentClass: profile.currentClass,
        coreSubjects: profile.coreSubjects,
        strugglingSubjects: profile.strugglingSubjects,
        hasTakenCbt: yesNo(profile.hasTakenCbt),
        computerComfort: String(profile.computerComfort),
        jambYear: String(profile.jambYear),
        jambTargetScore: profile.jambTargetScore,
        attendedExtraLessons: yesNo(profile.attendedExtraLessons),
        biggestChallenge: profile.biggestChallenge ?? "",
        strictCbtWilling: yesNo(profile.strictCbtWilling),
        followUpWilling: yesNo(profile.followUpWilling),
        mocksCommitment: yesNo(profile.mocksCommitment),
        motivation: profile.motivation,
        guardianName: profile.guardianName,
        guardianAddress: profile.guardianAddress,
        guardianPhone: profile.guardianPhone,
        guardianEmail: profile.guardianEmail ?? "",
        guardianSupports: yesNo(profile.guardianSupports),
        dataConsent: yesNo(profile.dataConsent),
        additionalInfo: profile.additionalInfo ?? "",
        university: profile.university,
        course: profile.course,
        status: profile.status,
        dateJoined: dateToInput(profile.dateJoined),
      }
    : EMPTY_PROFILE_VALUES;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Students", href: "/students" },
            { label: `${student.firstName} ${student.lastName}`, href: `/students/${id}` },
            { label: "Profile", href: `/students/${id}/profile` },
            { label: profile ? "Edit" : "Add" },
          ]}
        />
        <h1 className="mt-2 font-display text-2xl text-foreground">{profile ? "Edit profile" : "Add profile"}</h1>
      </div>
      <ProfileForm
        studentId={id}
        initialValues={initialValues}
        submitLabel={profile ? "Save changes" : "Save profile"}
        cancelHref={`/students/${id}/profile`}
      />
    </div>
  );
}
