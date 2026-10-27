import { prisma } from "@/lib/db";
import { parseStudentImport, type DateOrder } from "@/lib/profile-import";
import { editDistance, nameKey, nameTokens } from "@/lib/score-import";
import { toRow } from "@/lib/data/profiles";
import type { ProfileInput } from "@/lib/student-profile";

// "Add profiles to existing students": the same registration spreadsheet as the
// new-student import, but each row is matched to a student who already exists
// and their profile is added. It never creates a student, so a misspelled name
// is a problem to fix rather than a duplicate student.

// "all" = every student, "none" = students without a cohort, otherwise a cohort id.
export type MatchScope = string;

export type UpdateRowReport = {
  line: number;
  csvName: string;
  // "hasProfile" = matched, but that student already has a profile; they're left
  // alone and it doesn't block the import.
  state: "match" | "hasProfile" | "problem";
  student: { id: string; name: string; serialNumber: string } | null;
  // Matched by shared words ("Ebube Chioma Chukwu" ~ "Ebube Chukwu") rather than
  // an exact first + last name. Shown so it can be double-checked.
  loose: boolean;
  problems: string[];
};

export type ProfileUpdateReport = {
  scopeLabel: string;
  sheetName: string | null;
  headerRow: number;
  fileProblems: string[];
  rows: UpdateRowReport[];
  // Students in the chosen group with no profile who aren't in the file at all.
  notInFile: string[];
  dateJoinedFromStudent: number; // rows whose blank Date joined became "when they were added"
  counts: { matched: number; hasProfile: number; problems: number };
  canImport: boolean;
};

type Plan = {
  fileName: string | null;
  scopeLabel: string;
  items: { studentId: string; profile: ProfileInput }[];
};

export type AnalyzeProfileUpdateResult =
  | { ok: false; error: string }
  | { ok: true; report: ProfileUpdateReport; plan: Plan };

const utcDay = (date: Date) => new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);

// True when every word of the shorter name appears in the longer one (and the
// shorter has at least two words, so a lone "David" can't match anyone).
function sharesAllWords(a: string[], b: string[]) {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 2 && short.every((word) => long.includes(word));
}

export async function analyzeProfileUpdate(
  table: string[][],
  options: { dateOrder: DateOrder; scope: MatchScope; fileName?: string | null; sheetName?: string | null }
): Promise<AnalyzeProfileUpdateResult> {
  let scopeLabel = "All students";
  let scopeText = "the app";
  let studentFilter: object = {};
  if (options.scope === "none") {
    scopeLabel = "Students with no cohort";
    scopeText = "the group with no cohort";
    studentFilter = { cohortId: null };
  } else if (options.scope !== "all") {
    const cohort = await prisma.cohort.findUnique({ where: { id: options.scope } });
    if (!cohort) return { ok: false, error: "Choose which students to match the spreadsheet against." };
    scopeLabel = `Cohort ${cohort.name}`;
    scopeText = `cohort ${cohort.name}`;
    studentFilter = { cohortId: cohort.id };
  }

  const base = { scopeLabel, sheetName: options.sheetName ?? null };
  const emptyPlan: Plan = { fileName: options.fileName ?? null, scopeLabel, items: [] };

  const parsed = parseStudentImport(table, options.dateOrder);
  if (!parsed.ok) {
    return {
      ok: true,
      report: {
        ...base,
        headerRow: 1,
        fileProblems: [parsed.error],
        rows: [],
        notInFile: [],
        dateJoinedFromStudent: 0,
        counts: { matched: 0, hasProfile: 0, problems: 1 },
        canImport: false,
      },
      plan: emptyPlan,
    };
  }

  const [candidates, everyone] = await Promise.all([
    prisma.student.findMany({
      where: studentFilter,
      select: { id: true, firstName: true, lastName: true, serialNumber: true, createdAt: true, profile: { select: { id: true } } },
    }),
    options.scope === "all"
      ? Promise.resolve([])
      : prisma.student.findMany({ select: { firstName: true, lastName: true, cohort: { select: { name: true } } } }),
  ]);

  type Candidate = (typeof candidates)[number];
  const keyOf = (s: { firstName: string; lastName: string }) => nameKey(`${s.firstName} ${s.lastName}`);
  const byKey = new Map<string, Candidate[]>();
  for (const student of candidates) byKey.set(keyOf(student), [...(byKey.get(keyOf(student)) ?? []), student]);
  const elsewhereByKey = new Map<string, (typeof everyone)[number]>();
  for (const student of everyone) elsewhereByKey.set(keyOf(student), student);

  const claimed = new Map<string, number>(); // student id -> the row that matched them
  const rows: UpdateRowReport[] = [];
  const items: Plan["items"] = [];
  let dateJoinedFromStudent = 0;

  for (const row of parsed.rows) {
    if (!row.ok) {
      rows.push({ line: row.line, csvName: row.name, state: "problem", student: null, loose: false, problems: [row.error] });
      continue;
    }

    const csvName = `${row.firstName} ${row.lastName}`;
    const key = nameKey(csvName);
    const problems: string[] = [];
    let match: Candidate | null = null;
    let loose = false;

    const exact = byKey.get(key) ?? [];
    if (exact.length === 1) {
      match = exact[0];
    } else if (exact.length > 1) {
      problems.push(`More than one student in ${scopeText} is named "${csvName}", so it can't be matched safely.`);
    } else {
      const tokens = nameTokens(csvName);
      const near = candidates.filter((c) => sharesAllWords(tokens, nameTokens(`${c.firstName} ${c.lastName}`)));
      if (near.length === 1) {
        match = near[0];
        loose = true;
      } else if (near.length > 1) {
        problems.push(
          `"${csvName}" could be ${near.map((c) => `${c.firstName} ${c.lastName} (${c.serialNumber})`).join(" or ")}. Make the name more specific.`
        );
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
          problems.push(close.length > 0 ? `No student named "${csvName}". Did you mean ${close.join(" or ")}?` : `No student named "${csvName}".`);
        }
      }
    }

    if (match) {
      const earlier = claimed.get(match.id);
      if (earlier !== undefined) {
        problems.push(`${match.firstName} ${match.lastName} was already matched by row ${earlier}.`);
      } else {
        claimed.set(match.id, row.line);
      }
    }

    if (problems.length > 0 || !match) {
      rows.push({ line: row.line, csvName, state: "problem", student: null, loose: false, problems });
      continue;
    }

    const student = { id: match.id, name: `${match.firstName} ${match.lastName}`, serialNumber: match.serialNumber };
    if (match.profile) {
      rows.push({ line: row.line, csvName, state: "hasProfile", student, loose, problems: [] });
      continue;
    }

    // A blank Date joined becomes the day the student was added to the app.
    const profile = row.dateJoinedBlank ? { ...row.profile, dateJoined: utcDay(match.createdAt) } : row.profile;
    if (row.dateJoinedBlank) dateJoinedFromStudent++;
    items.push({ studentId: match.id, profile });
    rows.push({ line: row.line, csvName, state: "match", student, loose, problems: [] });
  }

  const counts = {
    matched: rows.filter((r) => r.state === "match").length,
    hasProfile: rows.filter((r) => r.state === "hasProfile").length,
    problems: rows.filter((r) => r.state === "problem").length,
  };
  const notInFile = candidates
    .filter((c) => !c.profile && !claimed.has(c.id))
    .map((c) => `${c.firstName} ${c.lastName}`)
    .sort();

  return {
    ok: true,
    report: {
      ...base,
      headerRow: parsed.headerRow,
      fileProblems: [],
      rows,
      notInFile,
      dateJoinedFromStudent,
      counts,
      canImport: counts.problems === 0 && counts.matched > 0,
    },
    plan: { fileName: options.fileName ?? null, scopeLabel, items },
  };
}

// Adds every profile in one transaction: if anything fails, nothing is saved.
export async function commitProfileUpdate(plan: Plan) {
  return prisma.$transaction(
    async (tx) => {
      const ids = plan.items.map((item) => item.studentId);
      // Someone may have added a profile by hand since the file was checked.
      const already = await tx.studentProfile.count({ where: { studentId: { in: ids } } });
      if (already > 0) {
        throw new Error("Some of these students got a profile while the file was being checked. Check the file again.");
      }

      const batch = await tx.studentImport.create({
        data: { kind: "profiles", fileName: plan.fileName, cohortName: plan.scopeLabel, studentCount: plan.items.length },
      });
      for (const item of plan.items) {
        await tx.studentProfile.create({ data: { ...toRow(item.profile), studentId: item.studentId, importBatchId: batch.id } });
      }
      return { importId: batch.id, count: plan.items.length };
    },
    { timeout: 30000, maxWait: 10000 }
  );
}
