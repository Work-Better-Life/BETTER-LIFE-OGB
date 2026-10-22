import { prisma } from "@/lib/db";
import { collectPhotoKeys } from "@/lib/data/photos";
import { deleteUploadedFiles } from "@/lib/storage";
import { averagePercentage } from "@/lib/scoring";
import { EXPORT_WINDOW_DAYS, type ExportWindow } from "@/lib/export-window";

export function serialSequence(serialNumber: string) {
  const match = serialNumber.match(/(\d+)$/);
  const seq = match ? parseInt(match[1], 10) : NaN;
  return Number.isFinite(seq) ? seq : 0;
}

// "Amara Okafor", 7 -> "AO007". The numeric part is one global sequence.
export function formatSerialNumber(firstName: string, lastName: string, sequence: number) {
  const initials = `${firstName.trim()[0] ?? ""}${lastName.trim()[0] ?? ""}`.toUpperCase();
  return `${initials}${String(sequence).padStart(3, "0")}`;
}

async function generateSerialNumber(firstName: string, lastName: string) {
  const initials = `${firstName.trim()[0] ?? ""}${lastName.trim()[0] ?? ""}`.toUpperCase();

  // The numeric part is a single global sequence across every student ever
  // added — regardless of initials — so student #1 is 001 and #500 is 500.
  const existing = await prisma.student.findMany({ select: { serialNumber: true } });

  const maxSeq = existing.reduce((max, student) => Math.max(max, serialSequence(student.serialNumber)), 0);

  return `${initials}${String(maxSeq + 1).padStart(3, "0")}`;
}

export async function listStudentsForPicker() {
  const students = await prisma.student.findMany({
    select: { id: true, firstName: true, lastName: true, serialNumber: true, cohortId: true },
  });
  return students.sort((a, b) => serialSequence(a.serialNumber) - serialSequence(b.serialNumber));
}

export type StudentSort = "oldest" | "newest" | "scored" | "name";

const VALID_SORTS: readonly StudentSort[] = ["oldest", "newest", "scored", "name"];

function normalizeSort(sort?: string): StudentSort {
  return VALID_SORTS.includes(sort as StudentSort) ? (sort as StudentSort) : "oldest";
}

const scoresInclude = {
  cohort: true,
  scores: {
    include: { topic: { include: { subject: true } } },
    orderBy: { recordedAt: "asc" as const },
  },
};

type RawStudentWithScores = Awaited<
  ReturnType<typeof prisma.student.findMany<{ include: typeof scoresInclude }>>
>[number];

function mapStudentRow(student: RawStudentWithScores) {
  const subjectNames = new Set(student.scores.map((s) => s.topic.subject.name));
  const lastEntry = student.scores.at(-1);
  return {
    id: student.id,
    serialNumber: student.serialNumber,
    firstName: student.firstName,
    lastName: student.lastName,
    createdAt: student.createdAt,
    cohortId: student.cohortId,
    cohortName: student.cohort?.name ?? null,
    subjectNames: Array.from(subjectNames),
    averagePercentage: averagePercentage(student.scores),
    lastRecordedAt: lastEntry?.recordedAt ?? null,
  };
}

type StudentRow = ReturnType<typeof mapStudentRow>;

function sortStudentRows(rows: StudentRow[], sort: StudentSort): StudentRow[] {
  if (sort === "scored") {
    return [...rows].sort((a, b) => {
      if (a.lastRecordedAt && b.lastRecordedAt) {
        return b.lastRecordedAt.getTime() - a.lastRecordedAt.getTime();
      }
      if (a.lastRecordedAt) return -1;
      if (b.lastRecordedAt) return 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }
  if (sort === "newest") {
    return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  if (sort === "name") {
    return [...rows].sort(
      (a, b) => a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName)
    );
  }
  return [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export const NO_COHORT = "none";

// `cohort` is a cohort id, NO_COHORT for students without one, or empty for everyone.
function buildStudentWhere(search?: string, cohort?: string) {
  const filters = [];
  if (search) {
    filters.push({
      OR: [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { serialNumber: { contains: search } },
      ],
    });
  }
  if (cohort === NO_COHORT) filters.push({ cohortId: null });
  else if (cohort) filters.push({ cohortId: cohort });
  return filters.length > 0 ? { AND: filters } : undefined;
}

export async function listStudents(
  search?: string,
  page?: number,
  pageSize?: number,
  sort?: string,
  cohort?: string
) {
  const normalizedSort = normalizeSort(sort);
  const where = buildStudentWhere(search, cohort);

  // "scored" can't be paginated at the database level — it sorts on a value
  // computed after fetching (lastRecordedAt). An omitted pageSize means
  // "return everything" (the CSV export's call site). Both cases fetch every
  // matching student, sort in JS, then slice out the requested page (if any).
  if (normalizedSort === "scored" || pageSize === undefined) {
    const students = await prisma.student.findMany({ where, include: scoresInclude });
    const sorted = sortStudentRows(students.map(mapStudentRow), normalizedSort);
    const total = sorted.length;

    if (pageSize === undefined) {
      return { students: sorted, total };
    }

    const currentPage = Math.max(1, page ?? 1);
    const start = (currentPage - 1) * pageSize;
    return { students: sorted.slice(start, start + pageSize), total };
  }

  // oldest / newest / name: page at the database level.
  const currentPage = Math.max(1, page ?? 1);
  const orderBy =
    normalizedSort === "newest"
      ? { createdAt: "desc" as const }
      : normalizedSort === "name"
        ? [{ firstName: "asc" as const }, { lastName: "asc" as const }]
        : { createdAt: "asc" as const };

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: scoresInclude,
      orderBy,
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { students: students.map(mapStudentRow), total };
}

export async function getStudentsForExport(search?: string, window: ExportWindow = "all", cohort?: string) {
  const where = buildStudentWhere(search, cohort);

  const windowDays = EXPORT_WINDOW_DAYS[window];
  const scoresWhere = windowDays
    ? { recordedAt: { gte: new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000) } }
    : undefined;

  const students = await prisma.student.findMany({
    where,
    include: {
      cohort: true,
      scores: {
        where: scoresWhere,
        include: { topic: { include: { subject: true } } },
        orderBy: { recordedAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return students
    .map(mapStudentRow)
    .filter((student) => window === "all" || student.lastRecordedAt !== null);
}

export async function getStudentDetail(id: string, startDate?: string, endDate?: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      cohort: true,
      scores: {
        include: { topic: { include: { subject: true } } },
        orderBy: { recordedAt: "asc" },
      },
    },
  });

  if (!student) return null;

  // Filter scores by date range in memory
  let filteredScores = student.scores;
  if (startDate) {
    const start = new Date(startDate);
    filteredScores = filteredScores.filter((s) => s.recordedAt >= start);
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    filteredScores = filteredScores.filter((s) => s.recordedAt <= end);
  }

  const bySubject = new Map<
    string,
    { subjectId: string; subjectName: string; topics: Map<string, typeof student.scores> }
  >();

  for (const entry of filteredScores) {
    const subject = entry.topic.subject;
    if (!bySubject.has(subject.id)) {
      bySubject.set(subject.id, { subjectId: subject.id, subjectName: subject.name, topics: new Map() });
    }
    const subjectGroup = bySubject.get(subject.id)!;
    if (!subjectGroup.topics.has(entry.topic.id)) {
      subjectGroup.topics.set(entry.topic.id, []);
    }
    subjectGroup.topics.get(entry.topic.id)!.push(entry);
  }

  return {
    id: student.id,
    serialNumber: student.serialNumber,
    firstName: student.firstName,
    lastName: student.lastName,
    createdAt: student.createdAt,
    cohortId: student.cohortId,
    cohortName: student.cohort?.name ?? null,
    averagePercentage: averagePercentage(filteredScores),
    scoreCount: filteredScores.length,
    rawScores: filteredScores,
    subjects: Array.from(bySubject.values()).map((subject) => ({
      subjectId: subject.subjectId,
      subjectName: subject.subjectName,
      topics: Array.from(subject.topics.entries()).map(([topicId, entries]) => ({
        topicId,
        topicName: entries[0].topic.name,
        entries,
      })),
    })),
  };
}

export async function createStudent(firstName: string, lastName: string, cohortId: string | null = null) {
  const serialNumber = await generateSerialNumber(firstName, lastName);
  return prisma.student.create({
    data: { firstName: firstName.trim(), lastName: lastName.trim(), serialNumber, cohortId },
  });
}

// `cohortId` undefined leaves the student's cohort as it is; null clears it.
export async function updateStudent(id: string, firstName: string, lastName: string, cohortId?: string | null) {
  return prisma.student.update({
    where: { id },
    data: { firstName: firstName.trim(), lastName: lastName.trim(), ...(cohortId !== undefined ? { cohortId } : {}) },
  });
}

// Deleting a student cascades to their photo record, which would orphan the
// file in UploadThing, so the file keys are collected first and the files are
// deleted once the student is really gone. If the student can't be deleted,
// their photo is left alone.
export async function deleteStudent(id: string) {
  const photoKeys = await collectPhotoKeys({ id });
  const deleted = await prisma.student.delete({ where: { id } });
  await deleteUploadedFiles(photoKeys);
  return deleted;
}

// The students either side of `id` in the list's default "oldest added" order,
// for the previous / next arrows. Either is null at the ends of the list.
export async function getStudentNeighbors(id: string) {
  const students = await prisma.student.findMany({
    select: { id: true, firstName: true, lastName: true, serialNumber: true, createdAt: true },
  });
  students.sort(
    (a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime() || serialSequence(a.serialNumber) - serialSequence(b.serialNumber)
  );

  const index = students.findIndex((student) => student.id === id);
  const pick = (student: (typeof students)[number] | undefined) =>
    student ? { id: student.id, name: `${student.firstName} ${student.lastName}` } : null;

  return {
    previous: index > 0 ? pick(students[index - 1]) : null,
    next: index >= 0 ? pick(students[index + 1]) : null,
  };
}
