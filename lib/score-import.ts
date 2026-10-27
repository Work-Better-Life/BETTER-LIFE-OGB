// Works on a grid of text cells, so it doesn't care whether the file was a CSV,
// an Excel workbook or an OpenDocument sheet (see lib/spreadsheet.ts).
//
// Score sheet layout this importer understands:
//
//   S/N, Name, Mathematics (10), Biology (10), ..., Total (50)
//
// - "Name" holds the student's name, first name and surname in either order.
// - Each subject column carries its max score in brackets: "Mathematics (10)".
// - "Total (..)" is optional and only used to double-check the row's sum.
// - An optional "Attendance (5)" column holds the days the student attended that
//   week (0-5). It isn't a subject and has no score; it's recorded separately.
// - Anything else (S/N, position, ...) is ignored.
// - A score cell is a number, or ABSENT, which is saved as a zero.

export type SheetColumn = { index: number; subjectName: string; max: number };

export type SheetCell =
  | { kind: "score"; value: number }
  | { kind: "absent" }
  | { kind: "bad"; problem: string };

// Days attended in the week, out of 5.
export type AttendanceCell = { kind: "days"; value: number } | { kind: "bad"; problem: string };

export type SheetRow = {
  line: number;
  name: string;
  cells: SheetCell[]; // same order as `columns`
  attendance: AttendanceCell | null; // null when the file has no Attendance column
  total: number | null; // null when the Total cell is missing, "-" or not a number
};

export type ParsedSheet = {
  fileProblems: string[];
  hasAttendance: boolean;
  columns: SheetColumn[];
  rows: SheetRow[];
  headerRow: number; // 1-based spreadsheet row the headers were found on
};

const SUBJECT_HEADER = /^(.*?)\s*\(\s*(\d+(?:\.\d+)?)\s*\)\s*$/;
export const NAME_HEADER = /^(student\s*)?name$|^full\s*name$|^student$/i;
export const ATTENDANCE_HEADER = /^attendance\b/i;
const TOTAL_HEADER = /^total\b/i;
const NUMBER = /^\d+(?:\.\d+)?$/;
const ABSENT = /^(absent|abs|ab)$/i;

// One attendance cell: a whole number of days from 0 to 5. ABSENT means the whole
// week was missed (0). Blank is a problem, not a silent zero: a week with no
// record is "not recorded", which is different from "attended no days".
export function parseAttendanceCell(raw: string, daysPerWeek = 5): AttendanceCell {
  const cell = raw.trim();
  if (cell === "") return { kind: "bad", problem: `Attendance is blank — enter the days attended (0 to ${daysPerWeek}), or 0` };
  if (ABSENT.test(cell)) return { kind: "days", value: 0 };
  if (!/^\d+$/.test(cell)) {
    return { kind: "bad", problem: `Attendance "${cell}" must be a whole number of days from 0 to ${daysPerWeek}` };
  }
  const value = Number(cell);
  if (value > daysPerWeek) return { kind: "bad", problem: `Attendance: ${value} is more than the ${daysPerWeek} days in a week` };
  return { kind: "days", value };
}

export const SUM_TOLERANCE = 0.001;

const HEADER_SEARCH_ROWS = 15;

// Spreadsheets often have a title or blank rows above the table. The header
// row is the first one that has a Name column and at least one subject column;
// if none does, row 1 is used so the problems reported are about the real header.
function findHeaderRow(table: string[][]): number {
  const limit = Math.min(table.length, HEADER_SEARCH_ROWS);
  for (let i = 0; i < limit; i++) {
    const cells = table[i].map((cell) => cell.trim());
    const hasName = cells.some((cell) => NAME_HEADER.test(cell));
    const hasSubject = cells.some((cell) => {
      const match = cell.match(SUBJECT_HEADER);
      return !!match && match[1].trim() !== "" && !TOTAL_HEADER.test(cell) && !ATTENDANCE_HEADER.test(cell);
    });
    if (hasName && hasSubject) return i;
  }
  return 0;
}

export function parseScoreSheet(table: string[][], knownSubjectNames: string[]): ParsedSheet {
  const fileProblems: string[] = [];
  const headerIndex = findHeaderRow(table);
  const headerRow = headerIndex + 1;
  if (table.length < headerIndex + 2) {
    return { fileProblems: ["The file has no student rows."], hasAttendance: false, columns: [], rows: [], headerRow };
  }

  const headers = (table[headerIndex] ?? []).map((h) => h.trim());
  const known = new Set(knownSubjectNames.map((n) => n.toLowerCase()));

  let nameIndex = -1;
  let attendanceIndex = -1;
  let totalIndex = -1;
  let totalMax: number | null = null;
  const columns: SheetColumn[] = [];
  const seenSubjects = new Set<string>();

  headers.forEach((header, index) => {
    if (nameIndex === -1 && NAME_HEADER.test(header)) {
      nameIndex = index;
      return;
    }
    // Checked before the subject rule: "Attendance (5)" looks like a subject with a max.
    if (attendanceIndex === -1 && ATTENDANCE_HEADER.test(header)) {
      attendanceIndex = index;
      const bracket = header.match(SUBJECT_HEADER);
      if (bracket && Number(bracket[2]) !== 5) {
        fileProblems.push(`"${header}": attendance is out of 5 days (a school week). Write it as "Attendance (5)".`);
      }
      return;
    }
    if (totalIndex === -1 && TOTAL_HEADER.test(header)) {
      totalIndex = index;
      const bracket = header.match(SUBJECT_HEADER);
      if (bracket) totalMax = Number(bracket[2]);
      return;
    }
    const match = header.match(SUBJECT_HEADER);
    if (match && match[1].trim() !== "") {
      const subjectName = match[1].trim();
      const max = Number(match[2]);
      if (!Number.isInteger(max) || max < 1) {
        fileProblems.push(`"${header}": the max score must be a whole number of at least 1.`);
        return;
      }
      if (seenSubjects.has(subjectName.toLowerCase())) {
        fileProblems.push(`Subject "${subjectName}" appears in more than one column.`);
        return;
      }
      seenSubjects.add(subjectName.toLowerCase());
      columns.push({ index, subjectName, max });
      return;
    }
    // A column named like a subject but with no max can't be scored safely.
    if (header !== "" && known.has(header.toLowerCase())) {
      fileProblems.push(`Column "${header}" has no max score — write it like "${header} (10)".`);
    }
  });

  if (nameIndex === -1) fileProblems.push(`No "Name" column found in the header row (row ${headerRow}).`);
  if (columns.length === 0) {
    fileProblems.push('No subject columns found. Each needs its max score in brackets, like "Mathematics (10)".');
  }
  if (totalMax !== null && columns.length > 0) {
    const sumOfMaxes = columns.reduce((sum, c) => sum + c.max, 0);
    if (Math.abs(totalMax - sumOfMaxes) > SUM_TOLERANCE) {
      fileProblems.push(`The Total column says out of ${totalMax}, but the subject maxes add up to ${sumOfMaxes}.`);
    }
  }
  const hasAttendance = attendanceIndex !== -1;
  if (nameIndex === -1 || columns.length === 0) return { fileProblems, hasAttendance, columns, rows: [], headerRow };

  const rows: SheetRow[] = [];
  table.slice(headerIndex + 1).forEach((cells, i) => {
    const line = headerIndex + i + 2; // the row's number in the spreadsheet
    const name = (cells[nameIndex] ?? "").trim();
    const raw = columns.map((c) => (cells[c.index] ?? "").trim());
    if (name === "" && raw.every((cell) => cell === "")) return; // fully blank row

    const parsedCells: SheetCell[] = columns.map((column, position) => {
      const cell = raw[position];
      if (cell === "") return { kind: "bad", problem: `${column.subjectName} is blank` };
      if (ABSENT.test(cell)) return { kind: "absent" };
      if (!NUMBER.test(cell)) return { kind: "bad", problem: `${column.subjectName} "${cell}" isn't a number or ABSENT` };
      const value = Number(cell);
      if (value > column.max) {
        return { kind: "bad", problem: `${column.subjectName}: ${value} is higher than the max of ${column.max}` };
      }
      return { kind: "score", value };
    });

    const totalCell = totalIndex === -1 ? "" : (cells[totalIndex] ?? "").trim();
    const attendance = hasAttendance ? parseAttendanceCell(cells[attendanceIndex] ?? "") : null;
    rows.push({ line, name, cells: parsedCells, attendance, total: NUMBER.test(totalCell) ? Number(totalCell) : null });
  });

  if (rows.length === 0) fileProblems.push("The file has no student rows.");
  return { fileProblems, hasAttendance, columns, rows, headerRow };
}

// Sum of a row's scores, counting ABSENT as 0. Null if any cell is unusable.
export function rowSum(row: SheetRow): number | null {
  let sum = 0;
  for (const cell of row.cells) {
    if (cell.kind === "bad") return null;
    if (cell.kind === "score") sum += cell.value;
  }
  return sum;
}

// --- name matching -------------------------------------------------------

// Lowercase, strip punctuation, split into words. Order is ignored later so
// "Destiny CHINDA" and "CHINDA Destiny" match the same student.
export function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function nameKey(name: string): string {
  return nameTokens(name).sort().join(" ");
}

export function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}
