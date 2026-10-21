import { prisma } from "@/lib/db";

export async function listCohorts() {
  const cohorts = await prisma.cohort.findMany({
    include: { _count: { select: { students: true } } },
    orderBy: { name: "asc" },
  });
  return cohorts.map((cohort) => ({ id: cohort.id, name: cohort.name, studentCount: cohort._count.students }));
}

export type CohortOption = Awaited<ReturnType<typeof listCohorts>>[number];

// Names are compared case-insensitively by trimming and matching an existing
// one first, so "2026" and "2026 " never become two cohorts.
export async function findOrCreateCohort(rawName: string) {
  const name = rawName.trim();
  const existing = (await prisma.cohort.findMany()).find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  return prisma.cohort.create({ data: { name } });
}

export async function renameCohort(id: string, rawName: string) {
  const name = rawName.trim();
  const clash = (await prisma.cohort.findMany()).find((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase());
  if (clash) throw new Error("A cohort with that name already exists.");
  return prisma.cohort.update({ where: { id }, data: { name } });
}

// Refuses to delete a cohort that still has students, so nobody is silently
// moved to "No cohort".
export async function deleteCohort(id: string) {
  const count = await prisma.student.count({ where: { cohortId: id } });
  if (count > 0) {
    throw new Error(`This cohort still has ${count} student${count === 1 ? "" : "s"}. Move them to another cohort first.`);
  }
  await prisma.cohort.delete({ where: { id } });
}

export async function assignStudentsToCohort(studentIds: string[], cohortId: string | null) {
  const result = await prisma.student.updateMany({
    where: { id: { in: studentIds } },
    data: { cohortId },
  });
  return result.count;
}

export const NEW_COHORT_VALUE = "__new__";

// Turns a cohort <select> value into a cohort id. "" means no cohort,
// NEW_COHORT_VALUE means create/reuse one by `newName`, anything else must be
// an existing cohort id. Returns an error message instead of throwing so the
// calling form action can show it.
export async function resolveCohortSelection(
  value: string,
  newName?: string
): Promise<{ cohortId: string | null } | { error: string }> {
  if (value === "") return { cohortId: null };
  if (value === NEW_COHORT_VALUE) {
    const name = (newName ?? "").trim();
    if (!name) return { error: "Type a name for the new cohort." };
    if (name.length > 60) return { error: "Cohort names can be up to 60 characters." };
    const cohort = await findOrCreateCohort(name);
    return { cohortId: cohort.id };
  }
  const cohort = await prisma.cohort.findUnique({ where: { id: value }, select: { id: true } });
  if (!cohort) return { error: "That cohort no longer exists." };
  return { cohortId: cohort.id };
}
