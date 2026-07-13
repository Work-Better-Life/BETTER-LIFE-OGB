import { prisma } from "@/lib/db";
import { averagePercentage } from "@/lib/scoring";
import { EXPORT_WINDOW_DAYS, type ExportWindow } from "@/lib/export-window";

function serialSequence(serialNumber: string) {
  const match = serialNumber.match(/(\d+)$/);
  const seq = match ? parseInt(match[1], 10) : NaN;
  return Number.isFinite(seq) ? seq : 0;
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
    select: { id: true, firstName: true, lastName: true, serialNumber: true },
  });
  return students.sort((a, b) => serialSequence(a.serialNumber) - serialSequence(b.serialNumber));
}

export type StudentSort = "oldest" | "newest" | "scored" | "name";

const VALID_SORTS: readonly StudentSort[] = ["oldest", "newest", "scored", "name"];

function normalizeSort(sort?: string): StudentSort {
  return VALID_SORTS.includes(sort as StudentSort) ? (sort as StudentSort) : "oldest";
}

const scoresInclude = {
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

export async function listStudents(search?: string, page?: number, pageSize?: number, sort?: string) {
  const normalizedSort = normalizeSort(sort);
  const where = search
    ? {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { serialNumber: { contains: search } },
        ],
      }
    : undefined;

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

export async function getStudentsForExport(search?: string, window: ExportWindow = "all") {
  const where = search
    ? {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { serialNumber: { contains: search } },
        ],
      }
    : undefined;

  const windowDays = EXPORT_WINDOW_DAYS[window];
  const scoresWhere = windowDays
    ? { recordedAt: { gte: new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000) } }
    : undefined;

  const students = await prisma.student.findMany({
    where,
    include: {
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

export async function getStudentDetail(id: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      scores: {
        include: { topic: { include: { subject: true } } },
        orderBy: { recordedAt: "asc" },
      },
    },
  });

  if (!student) return null;

  const bySubject = new Map<
    string,
    { subjectId: string; subjectName: string; topics: Map<string, typeof student.scores> }
  >();

  for (const entry of student.scores) {
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
    averagePercentage: averagePercentage(student.scores),
    scoreCount: student.scores.length,
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

export async function createStudent(firstName: string, lastName: string) {
  const serialNumber = await generateSerialNumber(firstName, lastName);
  return prisma.student.create({
    data: { firstName: firstName.trim(), lastName: lastName.trim(), serialNumber },
  });
}

export async function updateStudent(id: string, firstName: string, lastName: string) {
  return prisma.student.update({
    where: { id },
    data: { firstName: firstName.trim(), lastName: lastName.trim() },
  });
}

export async function deleteStudent(id: string) {
  return prisma.student.delete({ where: { id } });
}
