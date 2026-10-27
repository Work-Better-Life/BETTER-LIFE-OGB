import {
  GENDERS,
  PROFILE_SUBJECTS,
  firstIssue,
  profileSchema,
  type ProfileInput,
} from "@/lib/student-profile";

export type DateOrder = "dmy" | "mdy";

// RFC 4180-style parser: quoted fields, "" escapes, newlines inside quotes.
// `delimiter` lets the same parser read semicolon- and tab-separated files.
// Blank rows are dropped unless `keepBlankRows`, which score imports use so
// reported row numbers match the file.
export function parseCsv(text: string, delimiter = ",", keepBlankRows = false): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const source = text.replace(/^﻿/, "");

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return keepBlankRows ? rows : rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

type FieldKey =
  | "fullName"
  | "firstName"
  | "lastName"
  | "timestamp"
  | "gender"
  | "dateOfBirth"
  | "houseAddress"
  | "schoolName"
  | "schoolAddress"
  | "currentClass"
  | "coreSubjects"
  | "strugglingSubjects"
  | "hasTakenCbt"
  | "computerComfort"
  | "jambYear"
  | "jambTargetScore"
  | "attendedExtraLessons"
  | "biggestChallenge"
  | "strictCbtWilling"
  | "followUpWilling"
  | "mocksCommitment"
  | "motivation"
  | "guardianName"
  | "guardianAddress"
  | "guardianPhone"
  | "guardianEmail"
  | "guardianSupports"
  | "dataConsent"
  | "additionalInfo"
  | "university"
  | "course"
  | "status"
  | "dateJoined";

// The registration form's questions, exactly as worded, plus the four columns
// added after the form. The downloadable template uses this list, and the
// column rules below are written to recognise every one of these.
export const TEMPLATE_HEADERS = [
  "Full Name",
  "Gender",
  "Date of Birth",
  "House Address",
  "Name of Secondary School you attend",
  "School Address / Area",
  "Current Class",
  "Select four core subjects currently offered",
  "Which subjects do you struggle with the most?",
  "Have you ever written a Computer-Based Test (CBT)?",
  "How comfortable are you with using a computer?",
  "When are you planning to sit for JAMB?",
  "What score range are you aiming for in JAMB?",
  "Have you attended any JAMB extra lessons or tutorials before this time?",
  "What is your biggest challenge with exams right now, especially CBT?",
  "Would you be willing to take exams under strict CBT conditions without shortcuts?",
  "Will you be willing to attend follow up classes to prepare you for subsequent mock exams and JAMB exams proper?",
  "Can you commit to attending multiple mock exams and follow-up sessions?",
  "Why do you want to be part of this program?",
  "Parent/Guardian/Sponsor Full Name",
  "Address",
  "Phone Number",
  "Email Address",
  "Confirm you are aware and support your child's/ward's participation in this program?",
  "Do you consent to performance data being used strictly for academic analysis and improvement?",
  "Any additional information you would like us to know?",
  "University they are applying for",
  "Course they wish to study",
  "Status",
  "Date joined",
] as const;

// Matches the question wording in the registration form. First column to
// match a rule wins; each rule claims at most one column.
const COLUMN_RULES: Array<[FieldKey, RegExp]> = [
  ["timestamp", /^timestamp/],
  ["fullName", /^full name/],
  ["firstName", /^first\s*name$/],
  ["lastName", /^(last\s*name|surname|family\s*name)$/],
  ["gender", /^gender/],
  ["dateOfBirth", /date of birth/],
  ["houseAddress", /house address/],
  ["schoolName", /name of secondary school/],
  ["schoolAddress", /school address/],
  ["currentClass", /current class/],
  ["coreSubjects", /core subjects/],
  ["strugglingSubjects", /struggle with/],
  ["hasTakenCbt", /written a computer-based test/],
  ["computerComfort", /comfortable.*computer/],
  ["jambYear", /planning to sit/],
  ["jambTargetScore", /score range/],
  ["attendedExtraLessons", /extra lessons/],
  ["biggestChallenge", /biggest challenge/],
  ["strictCbtWilling", /strict cbt/],
  ["followUpWilling", /follow.up classes/],
  ["mocksCommitment", /commit to attending multiple mock/],
  ["motivation", /why do you want/],
  ["guardianName", /(parent|guardian|sponsor).*full name/],
  ["guardianAddress", /^address$/],
  ["guardianPhone", /phone/],
  ["guardianEmail", /email/],
  ["guardianSupports", /aware and support/],
  ["dataConsent", /consent/],
  ["additionalInfo", /additional information/],
  ["university", /university/],
  ["course", /^course/],
  ["status", /^status/],
  ["dateJoined", /date joined/],
];

// Columns the import can't proceed without. Everything else that's required
// by the profile schema will fail per row with a specific message.
const OPTIONAL_COLUMNS: FieldKey[] = [
  "timestamp",
  // A name is needed, but either "Full Name" or "First Name" + "Last Name" will do;
  // that's checked separately below.
  "fullName",
  "firstName",
  "lastName",
  // Students often haven't decided yet, so these can be left out entirely.
  "university",
  "course",
  "houseAddress",
  "biggestChallenge",
  "followUpWilling",
  "guardianEmail",
  "additionalInfo",
  "status",
  "dateJoined",
];

function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

function mapColumns(headers: string[]) {
  const columns = new Map<FieldKey, number>();
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    for (const [field, pattern] of COLUMN_RULES) {
      if (!columns.has(field) && pattern.test(normalized)) {
        columns.set(field, index);
        return;
      }
    }
  });
  return columns;
}

function toIsoDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? date.toISOString().slice(0, 10) : "";
}

// Returns YYYY-MM-DD, or "" if the value isn't a recognisable date.
export function normalizeDate(value: string, order: DateOrder): string {
  const text = value.trim();
  if (!text) return "";

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const slashed = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (slashed) {
    const a = Number(slashed[1]);
    const b = Number(slashed[2]);
    const year = Number(slashed[3]);
    // An unambiguous value (one side above 12) wins over the chosen order.
    if (a > 12) return toIsoDate(year, b, a);
    if (b > 12) return toIsoDate(year, a, b);
    return order === "dmy" ? toIsoDate(year, b, a) : toIsoDate(year, a, b);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : toIsoDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
}

function yesNo(value: string) {
  const v = value.trim().toLowerCase();
  if (["yes", "y", "true"].includes(v)) return "yes";
  if (["no", "n", "false"].includes(v)) return "no";
  return v === "" ? undefined : value;
}

function matchOption<T extends string>(value: string, options: readonly T[]): string {
  const found = options.find((o) => o.toLowerCase() === value.trim().toLowerCase());
  return found ?? value.trim();
}

function normalizeClass(value: string) {
  const v = value.toLowerCase();
  if (/graduated|resit/.test(v)) return "GRADUATED";
  if (/ss\s*2/.test(v)) return "SS2";
  if (/ss\s*3/.test(v)) return "SS3";
  return value.trim();
}

function normalizeStatus(value: string) {
  const v = value.toLowerCase().replace(/[^a-z]/g, "");
  if (!v) return undefined;
  if (v.startsWith("admit")) return "admitted";
  if (v.startsWith("defer")) return "deferred";
  if (v.startsWith("drop")) return "dropped_out";
  return value.trim();
}

function splitSubjects(value: string) {
  return value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => matchOption(s, PROFILE_SUBJECTS));
}

export function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export type ParsedImportRow =
  | {
      line: number;
      ok: true;
      firstName: string;
      lastName: string;
      profile: ProfileInput;
      // True when the sheet gave no Date joined (and no Timestamp to fall back on),
      // so profile.dateJoined is only a placeholder for the caller to replace.
      dateJoinedBlank: boolean;
    }
  | { line: number; ok: false; name: string; error: string };

export type ParsedImport =
  | { ok: false; error: string }
  | { ok: true; rows: ParsedImportRow[]; headerRow: number };

const HEADER_SEARCH_ROWS = 15;
const MIN_HEADER_MATCHES = 5;

// Spreadsheets sometimes have a title above the table. The header row is the
// one among the first few that matches the most known columns; row 1 if none
// matches enough, so the "missing column" message is about the real header.
function findHeaderRow(table: string[][]): number {
  let best = 0;
  let bestMatches = 0;
  for (let i = 0; i < Math.min(table.length, HEADER_SEARCH_ROWS); i++) {
    const matches = mapColumns(table[i]).size;
    if (matches > bestMatches) {
      best = i;
      bestMatches = matches;
    }
  }
  return bestMatches >= MIN_HEADER_MATCHES ? best : 0;
}

export function parseStudentImport(table: string[][], order: DateOrder = "dmy"): ParsedImport {
  const headerIndex = findHeaderRow(table);
  if (table.length < headerIndex + 2) return { ok: false, error: "The file has no student rows." };

  const columns = mapColumns(table[headerIndex]);
  const missing = COLUMN_RULES.map(([field]) => field).filter(
    (field) => !OPTIONAL_COLUMNS.includes(field) && !columns.has(field)
  );
  const hasNameColumns = columns.has("fullName") || (columns.has("firstName") && columns.has("lastName"));
  if (missing.length > 0 || !hasNameColumns) {
    const parts: string[] = [];
    if (!hasNameColumns) parts.push('a name column ("Full Name", or both "First Name" and "Last Name")');
    if (missing.length > 0) parts.push(missing.join(", "));
    return {
      ok: false,
      error: `Couldn't find column(s) for: ${parts.join("; ")}. Check the header row matches the registration form's questions.`,
    };
  }

  const rows: ParsedImportRow[] = [];
  table.slice(headerIndex + 1).forEach((cells, i) => {
    const line = headerIndex + i + 2; // the row's number in the spreadsheet
    if (cells.every((cell) => cell.trim() === "")) return; // blank row
    const get = (field: FieldKey) => {
      const index = columns.get(field);
      return index === undefined ? "" : (cells[index] ?? "").trim();
    };
    // "First Name" + "Last Name" columns win over "Full Name" when both exist.
    let displayName: string;
    let name: { firstName: string; lastName: string } | null;
    if (columns.has("firstName") && columns.has("lastName")) {
      const first = get("firstName");
      const last = get("lastName");
      displayName = `${first} ${last}`.trim();
      name = first && last ? { firstName: first, lastName: last } : null;
      if (!name) {
        rows.push({ line, ok: false, name: displayName || "(no name)", error: "Both a first name and a last name are needed." });
        return;
      }
    } else {
      displayName = get("fullName");
      name = splitFullName(displayName);
      if (!name) {
        rows.push({ line, ok: false, name: displayName || "(no name)", error: "Full name needs a first and last name." });
        return;
      }
    }

    // A Date joined that's filled in but unreadable is a problem to fix, not
    // something to quietly replace with today. Only a blank one falls back.
    const joinedText = get("dateJoined");
    const joinedParsed = normalizeDate(joinedText, order);
    if (joinedText !== "" && !joinedParsed) {
      rows.push({ line, ok: false, name: displayName, error: `Date joined "${joinedText}" isn't a date I can read (use something like 2026-10-01).` });
      return;
    }
    const timestampDate = normalizeDate(get("timestamp"), order);
    const dateJoinedBlank = !joinedParsed && !timestampDate;
    const dateJoined = joinedParsed || timestampDate || new Date().toISOString().slice(0, 10);

    const parsed = profileSchema.safeParse({
      gender: matchOption(get("gender"), GENDERS),
      dateOfBirth: normalizeDate(get("dateOfBirth"), order),
      houseAddress: get("houseAddress"),
      schoolName: get("schoolName"),
      schoolAddress: get("schoolAddress"),
      currentClass: normalizeClass(get("currentClass")),
      coreSubjects: splitSubjects(get("coreSubjects")),
      strugglingSubjects: splitSubjects(get("strugglingSubjects")),
      hasTakenCbt: yesNo(get("hasTakenCbt")),
      computerComfort: get("computerComfort"),
      jambYear: get("jambYear").match(/20\d{2}/)?.[0] ?? get("jambYear"),
      jambTargetScore: get("jambTargetScore"),
      attendedExtraLessons: yesNo(get("attendedExtraLessons")),
      biggestChallenge: get("biggestChallenge"),
      strictCbtWilling: yesNo(get("strictCbtWilling")),
      followUpWilling: yesNo(get("followUpWilling")),
      mocksCommitment: yesNo(get("mocksCommitment")),
      motivation: get("motivation"),
      guardianName: get("guardianName"),
      guardianAddress: get("guardianAddress"),
      guardianPhone: get("guardianPhone"),
      guardianEmail: get("guardianEmail"),
      guardianSupports: yesNo(get("guardianSupports")),
      dataConsent: yesNo(get("dataConsent")),
      additionalInfo: get("additionalInfo"),
      university: get("university"),
      course: get("course"),
      status: normalizeStatus(get("status")),
      dateJoined,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path[0] ? ` (${String(issue.path[0])})` : "";
      rows.push({ line, ok: false, name: displayName, error: `${firstIssue(parsed.error)}${field}` });
      return;
    }
    rows.push({ line, ok: true, firstName: name.firstName, lastName: name.lastName, profile: parsed.data, dateJoinedBlank });
  });

  return { ok: true, rows, headerRow: headerIndex + 1 };
}
