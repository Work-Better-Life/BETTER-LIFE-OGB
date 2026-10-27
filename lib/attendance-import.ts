import { ATTENDANCE_HEADER, NAME_HEADER, parseAttendanceCell, type AttendanceCell } from "@/lib/score-import";

// Attendance-only sheet, for recording weeks that were never imported:
//
//   Name, Attendance (5), Week
//
// - "Name" is the student, first name and surname in either order.
// - "Attendance (5)" is the days attended that week, 0 to 5 (ABSENT counts as 0).
// - "Week" is optional. When present, each row says which week it's for (any date in
//   that week will do), so one file can hold many weeks. When absent, every row is
//   for the week chosen on the import page.

const WEEK_HEADER = /^(week(\s*(of|starting|start|commencing|beginning|ending|ended))?|date)$/i;
const HEADER_SEARCH_ROWS = 15;

export type AttendanceRow = {
  line: number;
  name: string;
  attendance: AttendanceCell;
  weekText: string; // the Week cell as written ("" when there's no Week column or it's blank)
};

export type ParsedAttendanceSheet = {
  fileProblems: string[];
  hasWeekColumn: boolean;
  rows: AttendanceRow[];
  headerRow: number;
};

function findHeaderRow(table: string[][]): number {
  const limit = Math.min(table.length, HEADER_SEARCH_ROWS);
  for (let i = 0; i < limit; i++) {
    const cells = table[i].map((cell) => cell.trim());
    if (cells.some((c) => NAME_HEADER.test(c)) && cells.some((c) => ATTENDANCE_HEADER.test(c))) return i;
  }
  return 0;
}

export function parseAttendanceSheet(table: string[][]): ParsedAttendanceSheet {
  const fileProblems: string[] = [];
  const headerIndex = findHeaderRow(table);
  const headerRow = headerIndex + 1;
  if (table.length < headerIndex + 2) {
    return { fileProblems: ["The file has no student rows."], hasWeekColumn: false, rows: [], headerRow };
  }

  const headers = (table[headerIndex] ?? []).map((h) => h.trim());
  const nameIndex = headers.findIndex((h) => NAME_HEADER.test(h));
  const attendanceIndex = headers.findIndex((h) => ATTENDANCE_HEADER.test(h));
  const weekIndex = headers.findIndex((h) => WEEK_HEADER.test(h));

  if (nameIndex === -1) fileProblems.push(`No "Name" column found in the header row (row ${headerRow}).`);
  if (attendanceIndex === -1) {
    fileProblems.push('No "Attendance (5)" column found. It holds the days each student attended that week.');
  } else {
    const bracket = headers[attendanceIndex].match(/\(\s*(\d+(?:\.\d+)?)\s*\)/);
    if (bracket && Number(bracket[1]) !== 5) {
      fileProblems.push(`"${headers[attendanceIndex]}": attendance is out of 5 days (a school week). Write it as "Attendance (5)".`);
    }
  }
  if (nameIndex === -1 || attendanceIndex === -1) return { fileProblems, hasWeekColumn: false, rows: [], headerRow };

  const rows: AttendanceRow[] = [];
  table.slice(headerIndex + 1).forEach((cells, i) => {
    const line = headerIndex + i + 2; // the row's number in the spreadsheet
    const name = (cells[nameIndex] ?? "").trim();
    const raw = (cells[attendanceIndex] ?? "").trim();
    const weekText = weekIndex === -1 ? "" : (cells[weekIndex] ?? "").trim();
    if (name === "" && raw === "" && weekText === "") return; // blank row
    rows.push({ line, name, attendance: parseAttendanceCell(raw), weekText });
  });

  if (rows.length === 0) fileProblems.push("The file has no student rows.");
  return { fileProblems, hasWeekColumn: weekIndex !== -1, rows, headerRow };
}
