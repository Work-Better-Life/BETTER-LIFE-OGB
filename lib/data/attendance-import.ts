import { prisma } from "@/lib/db";
import { weekStartOf } from "@/lib/attendance";
import { parseAttendanceSheet } from "@/lib/attendance-import";
import { hashTableContents } from "@/lib/file-hash";
import { normalizeDate, type DateOrder } from "@/lib/profile-import";
import { editDistance, nameKey } from "@/lib/score-import";

// Attendance-only import: weeks that were recorded before attendance existed.
// Same all-or-nothing rules as the other imports — every problem is listed first
// and nothing is saved until the file is clean.

// "all" = every student, "none" = students without a cohort, otherwise a cohort id.
export type AttendanceScope = string;

export type AttendanceRowReport = {
  line: number;
  csvName: string;
  student: { id: string; name: string; serialNumber: string } | null;
  days: number | null;
  weekOf: string | null; // the Monday of the week this row is recorded against
  problems: string[];
};

export type AttendanceImportReport = {
  scopeLabel: string;
  sheetName: string | null;
  headerRow: number;
  fileProblems: string[];
  rows: AttendanceRowReport[];
  weeks: string[]; // the distinct weeks covered, as Mondays (YYYY-MM-DD)
  counts: { records: number; students: number; weeks: number; problems: number };
  canImport: boolean;
};

type Plan = {
  fileName: string | null;
  fileHash: string;
  scopeLabel: string;
  label: string;
  firstWeek: Date;
  items: { studentId: string; weekStart: Date; daysAttended: number }[];
};

export type AnalyzeAttendanceResult = { ok: false; error: string } | { ok: true; report: AttendanceImportReport; plan: Plan };

function formatDay(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export async function analyzeAttendanceImport(
  table: string[][],
  options: {
    dateOrder: DateOrder;
    scope: AttendanceScope;
    defaultWeek: string; // "YYYY-MM-DD" from the page, or "" when the file has a Week column
    fileName?: string | null;
    sheetName?: string | null;
  }
): Promise<AnalyzeAttendanceResult> {
  let scopeLabel = "All students";
  let scopeText = "the app";
  let studentFilter: object = {};
  if (options.scope === "none") {
    scopeLabel = "Students with no cohort";
    scopeText = "the group with no cohort";
    studentFilter = { cohortId: null };
  } else if (options.scope !== "all") {
    const cohort = await prisma.cohort.findUnique({ where: { id: options.scope } });
    if (!cohort) return { ok: false, error: "Choose which students this attendance is for." };
    scopeLabel = `Cohort ${cohort.name}`;
    scopeText = `cohort ${cohort.name}`;
    studentFilter = { cohortId: cohort.id };
  }

  let defaultWeekStart: Date | null = null;
  if (options.defaultWeek) {
    const parsed = new Date(`${options.defaultWeek}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return { ok: false, error: "Pick the week this attendance is for." };
    defaultWeekStart = weekStartOf(parsed);
  }

  const sheet = parseAttendanceSheet(table);
  const base = { scopeLabel, sheetName: options.sheetName ?? null, headerRow: sheet.headerRow };
  if (sheet.fileProblems.length > 0 && sheet.rows.length === 0) {
    return {
      ok: true,
      report: { ...base, fileProblems: sheet.fileProblems, rows: [], weeks: [], counts: { records: 0, students: 0, weeks: 0, problems: sheet.fileProblems.length }, canImport: false },
      plan: { fileName: null, fileHash: "", scopeLabel, label: "", firstWeek: new Date(0), items: [] },
    };
  }
  if (!sheet.hasWeekColumn && !defaultWeekStart) {
    return { ok: false, error: "Pick the week this attendance is for, or add a Week column to the file." };
  }

  const [candidates, everyone] = await Promise.all([
    prisma.student.findMany({ where: studentFilter, select: { id: true, firstName: true, lastName: true, serialNumber: true } }),
    options.scope === "all"
      ? Promise.resolve([])
      : prisma.student.findMany({ select: { firstName: true, lastName: true, cohort: { select: { name: true } } } }),
  ]);
  type Candidate = (typeof candidates)[number];
  const keyOf = (s: { firstName: string; lastName: string }) => nameKey(`${s.firstName} ${s.lastName}`);
  const byKey = new Map<string, Candidate[]>();
  for (const s of candidates) byKey.set(keyOf(s), [...(byKey.get(keyOf(s)) ?? []), s]);
  const elsewhereByKey = new Map<string, (typeof everyone)[number]>();
  for (const s of everyone) elsewhereByKey.set(keyOf(s), s);

  const currentWeek = weekStartOf(new Date());
  const seen = new Set<string>();
  const rows: AttendanceRowReport[] = sheet.rows.map((row) => {
    const problems: string[] = [];
    let student: AttendanceRowReport["student"] = null;
    let weekStart: Date | null = null;

    // The student
    const key = nameKey(row.name);
    if (!key) {
      problems.push("Name is blank.");
    } else {
      const matches = byKey.get(key) ?? [];
      if (matches.length === 1) {
        const m = matches[0];
        student = { id: m.id, name: `${m.firstName} ${m.lastName}`, serialNumber: m.serialNumber };
      } else if (matches.length > 1) {
        problems.push(`More than one student in ${scopeText} is named "${row.name}", so it can't be matched safely.`);
      } else {
        const elsewhere = elsewhereByKey.get(key);
        if (elsewhere) {
          const where = elsewhere.cohort ? `cohort ${elsewhere.cohort.name}` : "no cohort";
          problems.push(`Not in ${scopeText} — but a student with this name is in ${where}. Is the right group selected?`);
        } else {
          const close = candidates
            .map((c) => ({ c, d: editDistance(key, keyOf(c)) }))
            .filter(({ d }) => d <= 3)
            .sort((a, b) => a.d - b.d)
            .slice(0, 3)
            .map(({ c }) => `${c.firstName} ${c.lastName}`);
          problems.push(close.length > 0 ? `No student named "${row.name}". Did you mean ${close.join(" or ")}?` : `No student named "${row.name}".`);
        }
      }
    }

    // The week: the row's own Week cell, else the week chosen on the page
    if (row.weekText !== "") {
      const iso = normalizeDate(row.weekText, options.dateOrder);
      if (!iso) problems.push(`Week "${row.weekText}" isn't a date I can read (use something like 2026-10-05).`);
      else weekStart = weekStartOf(new Date(`${iso}T00:00:00.000Z`));
    } else if (defaultWeekStart) {
      weekStart = defaultWeekStart;
    } else {
      problems.push("Week is blank — enter a date in that week.");
    }
    if (weekStart && weekStart.getTime() > currentWeek.getTime()) {
      problems.push(`The week of ${formatDay(weekStart)} hasn't started yet.`);
    }

    if (row.attendance.kind === "bad") problems.push(row.attendance.problem + ".");

    if (student && weekStart) {
      const id = `${student.id}:${weekStart.toISOString()}`;
      if (seen.has(id)) problems.push(`${student.name} appears more than once for the week of ${formatDay(weekStart)}.`);
      seen.add(id);
    }

    return {
      line: row.line,
      csvName: row.name,
      student,
      days: row.attendance.kind === "days" ? row.attendance.value : null,
      weekOf: weekStart ? weekStart.toISOString().slice(0, 10) : null,
      problems,
    };
  });

  // Attendance already recorded for those students and weeks
  const checkable = rows.filter((r) => r.student && r.weekOf);
  if (checkable.length > 0) {
    const recorded = await prisma.attendance.findMany({
      where: {
        studentId: { in: Array.from(new Set(checkable.map((r) => r.student!.id))) },
        weekStart: { in: Array.from(new Set(checkable.map((r) => new Date(`${r.weekOf}T00:00:00.000Z`).getTime()))).map((t) => new Date(t)) },
      },
      select: { studentId: true, weekStart: true, daysAttended: true },
    });
    const have = new Map(recorded.map((a) => [`${a.studentId}:${a.weekStart.toISOString()}`, a.daysAttended]));
    for (const row of checkable) {
      const already = have.get(`${row.student!.id}:${new Date(`${row.weekOf}T00:00:00.000Z`).toISOString()}`);
      if (already !== undefined) {
        row.problems.push(
          `Attendance for the week of ${formatDay(new Date(`${row.weekOf}T00:00:00.000Z`))} is already recorded (${already} ${already === 1 ? "day" : "days"}). Remove this row, or undo the earlier import.`
        );
      }
    }
  }

  // The same sheet imported twice
  const fileProblems = [...sheet.fileProblems];
  const fileHash = hashTableContents(table);
  const earlier = await prisma.scoreImport.findFirst({ where: { fileHash }, orderBy: { createdAt: "desc" }, select: { testName: true, createdAt: true } });
  if (earlier) {
    fileProblems.push(
      `This exact attendance was already imported on ${formatDay(earlier.createdAt)} as "${earlier.testName}". Undo that import first if you want to import it again.`
    );
  }

  const good = rows.filter((r) => r.problems.length === 0 && r.student && r.weekOf && r.days !== null);
  const problemRows = rows.filter((r) => r.problems.length > 0).length;
  const weeks = Array.from(new Set(good.map((r) => r.weekOf!))).sort();
  const first = weeks[0] ? new Date(`${weeks[0]}T00:00:00.000Z`) : new Date();
  const label =
    weeks.length <= 1
      ? `Attendance · week of ${formatDay(first)}`
      : `Attendance · ${weeks.length} weeks from ${formatDay(first)}`;

  return {
    ok: true,
    report: {
      ...base,
      fileProblems,
      rows,
      weeks,
      counts: {
        records: good.length,
        students: new Set(good.map((r) => r.student!.id)).size,
        weeks: weeks.length,
        problems: fileProblems.length + problemRows,
      },
      canImport: fileProblems.length === 0 && rows.length > 0 && problemRows === 0,
    },
    plan: {
      fileName: options.fileName ?? null,
      fileHash,
      scopeLabel,
      label,
      firstWeek: first,
      items: good.map((r) => ({ studentId: r.student!.id, weekStart: new Date(`${r.weekOf}T00:00:00.000Z`), daysAttended: r.days! })),
    },
  };
}

const CHUNK = 300;

// Writes every record in one transaction: if anything fails, nothing is saved.
export async function commitAttendanceImport(plan: Plan) {
  return prisma.$transaction(
    async (tx) => {
      const batch = await tx.scoreImport.create({
        data: {
          kind: "attendance",
          testName: plan.label,
          fileName: plan.fileName,
          cohortName: plan.scopeLabel,
          recordedAt: plan.firstWeek,
          entryCount: plan.items.length,
          fileHash: plan.fileHash,
        },
      });
      const data = plan.items.map((item) => ({ ...item, importBatchId: batch.id }));
      for (let start = 0; start < data.length; start += CHUNK) {
        await tx.attendance.createMany({ data: data.slice(start, start + CHUNK) });
      }
      return { importId: batch.id, count: data.length, studentIds: Array.from(new Set(plan.items.map((i) => i.studentId))) };
    },
    { timeout: 30000, maxWait: 10000 }
  );
}
