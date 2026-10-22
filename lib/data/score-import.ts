import { prisma } from "@/lib/db";
import {
  SUM_TOLERANCE,
  editDistance,
  nameKey,
  parseScoreSheet,
  rowSum,
  type SheetCell,
} from "@/lib/score-import";

// "all" = every student, "none" = students without a cohort, anything else is a cohort id.
export type CohortChoice = string;

export type ImportRowReport = {
  line: number;
  csvName: string;
  student: { id: string; name: string; serialNumber: string } | null;
  scores: number[]; // one per subject column, ABSENT shown as 0
  absentCount: number;
  problems: string[];
};

export type ScoreImportReport = {
  testName: string;
  date: string;
  cohortLabel: string;
  sheetName: string | null; // which sheet was read, for workbooks
  headerRow: number;
  subjects: { name: string; max: number }[];
  fileProblems: string[];
  rows: ImportRowReport[];
  notInFile: string[];
  counts: { students: number; scores: number; absentZeros: number; problems: number };
  canImport: boolean;
};

type Plan = {
  testName: string;
  date: Date;
  cohortLabel: string;
  fileName: string | null;
  columns: { subjectId: string; max: number; topicId: string | null }[];
  students: { studentId: string; values: number[] }[];
};

export type AnalyzeResult = { ok: false; error: string } | { ok: true; report: ScoreImportReport; plan: Plan };

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function cellScore(cell: SheetCell) {
  return cell.kind === "score" ? cell.value : 0;
}

// Reads the CSV and checks everything against the database without writing
// anything. Every problem is collected, not just the first, so the file can be
// fixed in one pass. The returned plan is only usable when report.canImport.
export async function analyzeScoreImport(
  table: string[][],
  options: { testName: string; date: string; cohort: CohortChoice; fileName?: string | null; sheetName?: string | null }
): Promise<AnalyzeResult> {
  const testName = options.testName.trim();
  if (!testName) return { ok: false, error: "Give the test a name." };
  if (testName.length > 60) return { ok: false, error: "Test names can be up to 60 characters." };
  const date = parseDate(options.date);
  if (!date) return { ok: false, error: "Pick the date the test was written." };

  let cohortLabel = "All students";
  let scopeText = "the app"; // used inside sentences, e.g. "Not in cohort 2026"
  let studentFilter: object = {};
  if (options.cohort === "none") {
    cohortLabel = "Students with no cohort";
    scopeText = "the group with no cohort";
    studentFilter = { cohortId: null };
  } else if (options.cohort !== "all") {
    const cohort = await prisma.cohort.findUnique({ where: { id: options.cohort } });
    if (!cohort) return { ok: false, error: "Choose which cohort these scores are for." };
    cohortLabel = `Cohort ${cohort.name}`;
    scopeText = `cohort ${cohort.name}`;
    studentFilter = { cohortId: cohort.id };
  }

  const [subjects, candidates, everyone] = await Promise.all([
    prisma.subject.findMany({ include: { topics: true }, orderBy: { name: "asc" } }),
    prisma.student.findMany({ where: studentFilter, select: { id: true, firstName: true, lastName: true, serialNumber: true } }),
    options.cohort === "all"
      ? Promise.resolve([])
      : prisma.student.findMany({
          select: { id: true, firstName: true, lastName: true, cohort: { select: { name: true } } },
        }),
  ]);

  const sheet = parseScoreSheet(table, subjects.map((s) => s.name));
  const fileProblems = [...sheet.fileProblems];
  const subjectByName = new Map(subjects.map((s) => [s.name.toLowerCase(), s]));

  // Subject columns -> subjects, and whether this test name already exists in each.
  const columns: Plan["columns"] = [];
  const reportSubjects: ScoreImportReport["subjects"] = [];
  const existingTopicIds: string[] = [];
  for (const column of sheet.columns) {
    const subject = subjectByName.get(column.subjectName.toLowerCase());
    if (!subject) {
      fileProblems.push(
        `There's no subject called "${column.subjectName}". Subjects in the app: ${subjects.map((s) => s.name).join(", ")}.`
      );
      continue;
    }
    const topic = subject.topics.find((t) => t.name.trim().toLowerCase() === testName.toLowerCase());
    if (topic && topic.defaultMaxScore !== column.max) {
      fileProblems.push(
        `"${testName}" already exists in ${subject.name} with a max of ${topic.defaultMaxScore}, but this file says ${column.max}. Use a different test name or fix the file.`
      );
    }
    if (topic) existingTopicIds.push(topic.id);
    columns.push({ subjectId: subject.id, max: column.max, topicId: topic?.id ?? null });
    reportSubjects.push({ name: subject.name, max: column.max });
  }
  // Columns that couldn't be matched to a subject are skipped from here on; the
  // problem above already blocks the import.
  const usableIndexes = sheet.columns
    .map((column, index) => (subjectByName.has(column.subjectName.toLowerCase()) ? index : -1))
    .filter((index) => index !== -1);

  const allColumnsUsable = usableIndexes.length === sheet.columns.length;

  // Name matching, limited to the chosen cohort.
  const keyOf = (s: { firstName: string; lastName: string }) => nameKey(`${s.firstName} ${s.lastName}`);
  const candidatesByKey = new Map<string, typeof candidates>();
  for (const student of candidates) {
    const key = keyOf(student);
    candidatesByKey.set(key, [...(candidatesByKey.get(key) ?? []), student]);
  }
  const everyoneByKey = new Map<string, typeof everyone>();
  for (const student of everyone) {
    const key = keyOf(student);
    everyoneByKey.set(key, [...(everyoneByKey.get(key) ?? []), student]);
  }

  const seenStudentIds = new Set<string>();
  const rows: ImportRowReport[] = sheet.rows.map((row) => {
    const cells = usableIndexes.map((index) => row.cells[index]);
    const problems: string[] = [];
    let student: ImportRowReport["student"] = null;

    const key = nameKey(row.name);
    if (!key) {
      problems.push("Name is blank.");
    } else {
      const matches = candidatesByKey.get(key) ?? [];
      if (matches.length === 1) {
        const match = matches[0];
        student = { id: match.id, name: `${match.firstName} ${match.lastName}`, serialNumber: match.serialNumber };
        if (seenStudentIds.has(match.id)) problems.push(`${student.name} appears more than once in the file.`);
        seenStudentIds.add(match.id);
      } else if (matches.length > 1) {
        problems.push(`More than one student in ${scopeText} is named "${row.name}", so it can't be matched safely.`);
      } else {
        const elsewhere = (everyoneByKey.get(key) ?? [])[0];
        if (elsewhere) {
          const where = elsewhere.cohort ? `cohort ${elsewhere.cohort.name}` : "no cohort";
          problems.push(`Not in ${scopeText} — but a student with this name is in ${where}. Is the right cohort selected?`);
        } else {
          const close = candidates
            .map((s) => ({ s, d: editDistance(key, keyOf(s)) }))
            .filter(({ d }) => d <= 3)
            .sort((a, b) => a.d - b.d)
            .slice(0, 3)
            .map(({ s }) => `${s.firstName} ${s.lastName}`);
          problems.push(close.length > 0 ? `No student named "${row.name}". Did you mean ${close.join(" or ")}?` : `No student named "${row.name}".`);
        }
      }
    }

    for (const cell of cells) if (cell.kind === "bad") problems.push(cell.problem + ".");

    // Skip the Total check while a subject column is unusable: the sum would
    // leave that subject out and flag every row falsely. It runs once the
    // header is fixed.
    const sum = allColumnsUsable ? rowSum({ ...row, cells }) : null;
    if (row.total !== null && sum !== null && Math.abs(sum - row.total) > SUM_TOLERANCE) {
      problems.push(`The scores add up to ${sum} but the Total column says ${row.total}.`);
    }

    return {
      line: row.line,
      csvName: row.name,
      student,
      scores: cells.map(cellScore),
      absentCount: cells.filter((c) => c.kind === "absent").length,
      problems,
    };
  });

  // Scores already recorded for this test on this date (same student, same test).
  const matchedIds = rows.flatMap((r) => (r.student ? [r.student.id] : []));
  if (existingTopicIds.length > 0 && matchedIds.length > 0) {
    const existing = await prisma.scoreEntry.findMany({
      where: { topicId: { in: existingTopicIds }, studentId: { in: matchedIds }, recordedAt: date },
      select: { studentId: true, topicId: true },
    });
    const have = new Set(existing.map((e) => `${e.studentId}:${e.topicId}`));
    const subjectNameByTopic = new Map<string, string>();
    for (const subject of subjects) {
      for (const topic of subject.topics) subjectNameByTopic.set(topic.id, subject.name);
    }
    for (const row of rows) {
      if (!row.student) continue;
      const duplicated = columns
        .filter((c) => c.topicId && have.has(`${row.student!.id}:${c.topicId}`))
        .map((c) => subjectNameByTopic.get(c.topicId!)!);
      if (duplicated.length > 0) {
        row.problems.push(`Already has scores for "${testName}" on ${formatDate(date)} (${duplicated.join(", ")}).`);
      }
    }
  }

  // Students in the cohort who aren't in the file at all: information, not an error.
  const notInFile =
    options.cohort === "all"
      ? []
      : candidates
          .filter((s) => !seenStudentIds.has(s.id))
          .map((s) => `${s.firstName} ${s.lastName}`)
          .sort();

  const problemRows = rows.filter((r) => r.problems.length > 0).length;
  const goodRows = rows.filter((r) => r.problems.length === 0 && r.student);
  const report: ScoreImportReport = {
    testName,
    date: options.date,
    cohortLabel,
    sheetName: options.sheetName ?? null,
    headerRow: sheet.headerRow,
    subjects: reportSubjects,
    fileProblems,
    rows,
    notInFile,
    counts: {
      students: goodRows.length,
      scores: goodRows.length * columns.length,
      absentZeros: goodRows.reduce((sum, r) => sum + r.absentCount, 0),
      problems: fileProblems.length + problemRows,
    },
    canImport: fileProblems.length === 0 && rows.length > 0 && problemRows === 0 && columns.length > 0,
  };

  const plan: Plan = {
    testName,
    date,
    cohortLabel,
    fileName: options.fileName ?? null,
    columns,
    students: goodRows.map((r) => ({ studentId: r.student!.id, values: r.scores })),
  };
  return { ok: true, report, plan };
}

const CHUNK = 300;

// Writes the whole import in one transaction: if anything fails, nothing is saved.
export async function commitScoreImport(plan: Plan) {
  return prisma.$transaction(
    async (tx) => {
      const batch = await tx.scoreImport.create({
        data: {
          testName: plan.testName,
          fileName: plan.fileName,
          cohortName: plan.cohortLabel,
          recordedAt: plan.date,
          entryCount: plan.students.length * plan.columns.length,
        },
      });

      const createdTopicIds: string[] = [];
      const topicIds: string[] = [];
      for (const column of plan.columns) {
        if (column.topicId) {
          topicIds.push(column.topicId);
          continue;
        }
        const topic = await tx.topic.create({
          data: { subjectId: column.subjectId, name: plan.testName, defaultMaxScore: column.max },
        });
        createdTopicIds.push(topic.id);
        topicIds.push(topic.id);
      }

      const entries = plan.students.flatMap((student) =>
        plan.columns.map((column, position) => ({
          studentId: student.studentId,
          topicId: topicIds[position],
          value: student.values[position],
          maxScore: column.max,
          recordedAt: plan.date,
          importBatchId: batch.id,
        }))
      );
      for (let start = 0; start < entries.length; start += CHUNK) {
        await tx.scoreEntry.createMany({ data: entries.slice(start, start + CHUNK) });
      }

      if (createdTopicIds.length > 0) {
        await tx.scoreImport.update({ where: { id: batch.id }, data: { createdTopicIds: JSON.stringify(createdTopicIds) } });
      }
      return { importId: batch.id, entryCount: entries.length, studentIds: plan.students.map((s) => s.studentId) };
    },
    { timeout: 30000, maxWait: 10000 }
  );
}

export async function listScoreImports(limit = 10) {
  const imports = await prisma.scoreImport.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { _count: { select: { entries: true } } },
  });
  return imports.map((i) => ({
    id: i.id,
    testName: i.testName,
    fileName: i.fileName,
    cohortName: i.cohortName,
    recordedAt: i.recordedAt.toISOString(),
    createdAt: i.createdAt.toISOString(),
    entryCount: i.entryCount,
    remaining: i._count.entries,
  }));
}

// Removes every score the import created, plus the tests (topics) it created if
// they're now empty, then the import record. One transaction.
export async function undoScoreImport(id: string) {
  return prisma.$transaction(
    async (tx) => {
      const batch = await tx.scoreImport.findUnique({ where: { id } });
      if (!batch) throw new Error("This import was already undone.");

      const affected = await tx.scoreEntry.findMany({ where: { importBatchId: id }, select: { studentId: true } });
      const removed = await tx.scoreEntry.deleteMany({ where: { importBatchId: id } });

      let topicIds: string[] = [];
      try {
        topicIds = JSON.parse(batch.createdTopicIds);
      } catch {
        topicIds = [];
      }
      for (const topicId of Array.isArray(topicIds) ? topicIds : []) {
        const left = await tx.scoreEntry.count({ where: { topicId } });
        if (left === 0) await tx.topic.deleteMany({ where: { id: topicId } });
      }

      await tx.scoreImport.delete({ where: { id } });
      return { removed: removed.count, studentIds: Array.from(new Set(affected.map((e) => e.studentId))) };
    },
    { timeout: 30000, maxWait: 10000 }
  );
}
