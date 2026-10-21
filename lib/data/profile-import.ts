import { prisma } from "@/lib/db";
import { parseStudentImport, type DateOrder } from "@/lib/profile-import";
import { formatSerialNumber, serialSequence } from "@/lib/data/students";
import { toRow } from "@/lib/data/profiles";
import type { ProfileInput } from "@/lib/student-profile";

export type CohortSelection =
  | { kind: "none" }
  | { kind: "existing"; id: string; name: string }
  | { kind: "new"; name: string };

export type StudentRowReport = {
  line: number;
  csvName: string;
  // "exists" = same name and date of birth is already in the app; it's left
  // alone and does not block the import.
  state: "new" | "exists" | "problem";
  existingSerial?: string;
  problems: string[];
};

export type StudentImportReport = {
  cohortLabel: string;
  sheetName: string | null;
  headerRow: number;
  fileProblems: string[];
  rows: StudentRowReport[];
  counts: { new: number; existing: number; problems: number };
  canImport: boolean;
};

type Plan = {
  fileName: string | null;
  cohort: CohortSelection;
  students: { firstName: string; lastName: string; profile: ProfileInput }[];
};

export type AnalyzeStudentImportResult = { report: StudentImportReport; plan: Plan };

function cohortLabelFor(cohort: CohortSelection) {
  if (cohort.kind === "existing") return `Cohort ${cohort.name}`;
  if (cohort.kind === "new") return `New cohort “${cohort.name}”`;
  return "No cohort";
}

const identityKey = (firstName: string, lastName: string, dateOfBirth: Date) =>
  `${`${firstName} ${lastName}`.toLowerCase().replace(/\s+/g, " ").trim()}|${dateOfBirth.toISOString().slice(0, 10)}`;

// Reads the file and checks every row against the rules and the database
// without writing anything. All problems are collected, not just the first, so
// the file can be fixed in one pass. The plan is only meant to be committed
// when report.canImport.
export async function analyzeStudentImport(
  table: string[][],
  options: { dateOrder: DateOrder; cohort: CohortSelection; fileName?: string | null; sheetName?: string | null }
): Promise<AnalyzeStudentImportResult> {
  const cohortLabel = cohortLabelFor(options.cohort);
  const base = { cohortLabel, sheetName: options.sheetName ?? null };
  const emptyPlan: Plan = { fileName: options.fileName ?? null, cohort: options.cohort, students: [] };

  const parsed = parseStudentImport(table, options.dateOrder);
  if (!parsed.ok) {
    return {
      report: {
        ...base,
        headerRow: 1,
        fileProblems: [parsed.error],
        rows: [],
        counts: { new: 0, existing: 0, problems: 1 },
        canImport: false,
      },
      plan: emptyPlan,
    };
  }

  // Everyone already in the app who has a profile (name + date of birth is how
  // "the same person" is recognised).
  const known = await prisma.student.findMany({
    where: { profile: { isNot: null } },
    select: { firstName: true, lastName: true, serialNumber: true, profile: { select: { dateOfBirth: true } } },
  });
  const existingByKey = new Map<string, string>();
  for (const student of known) {
    if (student.profile) existingByKey.set(identityKey(student.firstName, student.lastName, student.profile.dateOfBirth), student.serialNumber);
  }

  const seenInFile = new Set<string>();
  const rows: StudentRowReport[] = [];
  const students: Plan["students"] = [];

  for (const row of parsed.rows) {
    if (!row.ok) {
      rows.push({ line: row.line, csvName: row.name, state: "problem", problems: [row.error] });
      continue;
    }
    const csvName = `${row.firstName} ${row.lastName}`;
    const key = identityKey(row.firstName, row.lastName, row.profile.dateOfBirth);

    if (seenInFile.has(key)) {
      rows.push({
        line: row.line,
        csvName,
        state: "problem",
        problems: ["This student appears more than once in the file (same name and date of birth)."],
      });
      continue;
    }
    seenInFile.add(key);

    const existingSerial = existingByKey.get(key);
    if (existingSerial) {
      rows.push({ line: row.line, csvName, state: "exists", existingSerial, problems: [] });
      continue;
    }

    rows.push({ line: row.line, csvName, state: "new", problems: [] });
    students.push({ firstName: row.firstName, lastName: row.lastName, profile: row.profile });
  }

  const counts = {
    new: rows.filter((r) => r.state === "new").length,
    existing: rows.filter((r) => r.state === "exists").length,
    problems: rows.filter((r) => r.state === "problem").length,
  };

  return {
    report: {
      ...base,
      headerRow: parsed.headerRow,
      fileProblems: [],
      rows,
      counts,
      canImport: counts.problems === 0 && counts.new > 0,
    },
    plan: { fileName: options.fileName ?? null, cohort: options.cohort, students },
  };
}

// Creates every new student and profile in one transaction: if anything fails,
// nothing is saved. Serial numbers continue the global sequence in memory so the
// whole batch is numbered consistently.
export async function commitStudentImport(plan: Plan) {
  return prisma.$transaction(
    async (tx) => {
      let cohortId: string | null = null;
      let cohortName: string | null = null;
      if (plan.cohort.kind === "existing") {
        const cohort = await tx.cohort.findUnique({ where: { id: plan.cohort.id } });
        if (!cohort) throw new Error("That cohort no longer exists.");
        cohortId = cohort.id;
        cohortName = cohort.name;
      } else if (plan.cohort.kind === "new") {
        const wanted = plan.cohort.name.trim();
        const match = (await tx.cohort.findMany()).find((c) => c.name.toLowerCase() === wanted.toLowerCase());
        const cohort = match ?? (await tx.cohort.create({ data: { name: wanted } }));
        cohortId = cohort.id;
        cohortName = cohort.name;
      }

      const existing = await tx.student.findMany({ select: { serialNumber: true } });
      const maxSequence = existing.reduce((max, s) => Math.max(max, serialSequence(s.serialNumber)), 0);

      const batch = await tx.studentImport.create({
        data: {
          fileName: plan.fileName,
          cohortName: cohortName ? `Cohort ${cohortName}` : "No cohort",
          studentCount: plan.students.length,
        },
      });

      const serials: string[] = [];
      for (const [index, student] of plan.students.entries()) {
        const serialNumber = formatSerialNumber(student.firstName, student.lastName, maxSequence + 1 + index);
        await tx.student.create({
          data: {
            firstName: student.firstName.trim(),
            lastName: student.lastName.trim(),
            serialNumber,
            cohortId,
            importBatchId: batch.id,
            profile: { create: toRow(student.profile) },
          },
        });
        serials.push(serialNumber);
      }
      return { importId: batch.id, created: serials.length, serials };
    },
    { timeout: 30000, maxWait: 10000 }
  );
}

export async function listStudentImports(limit = 10) {
  const imports = await prisma.studentImport.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { _count: { select: { students: true } } },
  });
  return imports.map((i) => ({
    id: i.id,
    fileName: i.fileName,
    cohortName: i.cohortName,
    createdAt: i.createdAt.toISOString(),
    studentCount: i.studentCount,
    remaining: i._count.students,
  }));
}

// Removes every student the import created, with their profiles and photos. It
// refuses if any of them already has scores, because deleting a student also
// deletes their scores and that can't be recovered.
export async function undoStudentImport(id: string) {
  return prisma.$transaction(
    async (tx) => {
      const batch = await tx.studentImport.findUnique({ where: { id } });
      if (!batch) throw new Error("This import was already undone.");

      const students = await tx.student.findMany({ where: { importBatchId: id }, select: { id: true } });
      const ids = students.map((s) => s.id);

      if (ids.length > 0) {
        const withScores = await tx.scoreEntry.findMany({
          where: { studentId: { in: ids } },
          select: { studentId: true },
          distinct: ["studentId"],
        });
        if (withScores.length > 0) {
          throw new Error(
            `Can't undo this import: ${withScores.length} of its ${ids.length} students already have scores recorded, and undoing would delete those scores too. Delete the students you don't want one by one instead.`
          );
        }
        await tx.student.deleteMany({ where: { importBatchId: id } });
      }

      await tx.studentImport.delete({ where: { id } });
      return { removed: ids.length };
    },
    { timeout: 30000, maxWait: 10000 }
  );
}
