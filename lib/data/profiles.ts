import { prisma } from "@/lib/db";
import { parseSubjects, type ProfileInput } from "@/lib/student-profile";

export function toRow(input: ProfileInput) {
  return {
    ...input,
    coreSubjects: JSON.stringify(input.coreSubjects),
    strugglingSubjects: JSON.stringify(input.strugglingSubjects),
  };
}

export async function getProfile(studentId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { studentId } });
  if (!profile) return null;
  return {
    ...profile,
    coreSubjects: parseSubjects(profile.coreSubjects),
    strugglingSubjects: parseSubjects(profile.strugglingSubjects),
  };
}

export async function upsertProfile(studentId: string, input: ProfileInput) {
  const row = toRow(input);
  return prisma.studentProfile.upsert({
    where: { studentId },
    update: row,
    create: { ...row, studentId },
  });
}
