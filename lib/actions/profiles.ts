"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { guardWrite } from "@/lib/auth";
import * as profilesData from "@/lib/data/profiles";
import { firstIssue, profileSchema } from "@/lib/student-profile";

export type StudentProfileFormState = { error?: string };

function readProfileForm(formData: FormData) {
  const text = (key: string) => formData.get(key)?.toString() || undefined;
  return {
    gender: text("gender"),
    dateOfBirth: text("dateOfBirth"),
    houseAddress: text("houseAddress"),
    schoolName: text("schoolName"),
    schoolAddress: text("schoolAddress"),
    currentClass: text("currentClass"),
    coreSubjects: formData.getAll("coreSubjects").map(String),
    strugglingSubjects: formData.getAll("strugglingSubjects").map(String),
    hasTakenCbt: text("hasTakenCbt"),
    computerComfort: text("computerComfort"),
    jambYear: text("jambYear"),
    jambTargetScore: text("jambTargetScore"),
    attendedExtraLessons: text("attendedExtraLessons"),
    biggestChallenge: text("biggestChallenge"),
    strictCbtWilling: text("strictCbtWilling"),
    followUpWilling: text("followUpWilling"),
    mocksCommitment: text("mocksCommitment"),
    motivation: text("motivation"),
    guardianName: text("guardianName"),
    guardianAddress: text("guardianAddress"),
    guardianPhone: text("guardianPhone"),
    guardianEmail: text("guardianEmail"),
    guardianSupports: text("guardianSupports"),
    dataConsent: text("dataConsent"),
    additionalInfo: text("additionalInfo"),
    university: text("university"),
    course: text("course"),
    status: text("status"),
    dateJoined: text("dateJoined"),
  };
}

// Creates or updates the student's profile. Redirects to the profile page on
// success, so it only ever returns when there's an error to show.
export async function saveProfileAction(studentId: string, formData: FormData): Promise<StudentProfileFormState> {
  const denied = await guardWrite();
  if (denied) return { error: denied };

  const profile = profileSchema.safeParse(readProfileForm(formData));
  if (!profile.success) return { error: firstIssue(profile.error) };

  await profilesData.upsertProfile(studentId, profile.data);

  revalidatePath(`/students/${studentId}`);
  revalidatePath(`/students/${studentId}/profile`);
  redirect(`/students/${studentId}/profile`);
}
