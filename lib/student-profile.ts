import { z } from "zod";

export const PROFILE_SUBJECTS = [
  "English Language",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Financial Accounting",
  "Literature in English",
  "CRS",
  "Government",
] as const;

export const GENDERS = ["Female", "Male"] as const;

export const CLASS_LABELS = {
  SS2: "SS2",
  SS3: "SS3",
  GRADUATED: "Graduated Secondary (Resitting JAMB)",
} as const;
export const CLASSES = Object.keys(CLASS_LABELS) as [keyof typeof CLASS_LABELS, ...(keyof typeof CLASS_LABELS)[]];

export const STATUS_LABELS = {
  admitted: "Admitted",
  deferred: "Deferred",
  dropped_out: "Dropped out",
} as const;
export const STATUSES = Object.keys(STATUS_LABELS) as [keyof typeof STATUS_LABELS, ...(keyof typeof STATUS_LABELS)[]];

export const JAMB_YEARS = [2026, 2027] as const;

export type ProfileStatus = keyof typeof STATUS_LABELS;

function required(label: string) {
  return z
    .string()
    .nullish()
    .transform((v) => v?.trim() ?? "")
    .pipe(z.string().min(1, `${label} is required.`));
}

function optionalText() {
  return z
    .string()
    .nullish()
    .transform((v) => v?.trim() || null);
}

function requiredDate(label: string) {
  return required(label)
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be a valid date.`))
    .transform((v) => new Date(`${v}T00:00:00.000Z`))
    .pipe(z.date({ error: `${label} must be a valid date.` }));
}

// Radio groups submit "yes" / "no"; a missing answer reads as unanswered.
function requiredYesNo(label: string) {
  return z
    .enum(["yes", "no"], { error: `${label}: choose Yes or No.` })
    .transform((v) => v === "yes");
}

const optionalYesNo = z
  .enum(["yes", "no"])
  .nullish()
  .transform((v) => (v ? v === "yes" : null));

function subjectList() {
  return z.array(z.enum(PROFILE_SUBJECTS)).transform((v) => Array.from(new Set(v)));
}

export const profileSchema = z.object({
  gender: z.enum(GENDERS, { error: "Gender is required." }),
  dateOfBirth: requiredDate("Date of birth"),
  houseAddress: optionalText(),

  schoolName: required("School name"),
  schoolAddress: required("School address / area"),
  currentClass: z.enum(CLASSES, { error: "Current class is required." }),

  coreSubjects: subjectList().pipe(
    z.array(z.enum(PROFILE_SUBJECTS)).length(4, "Select exactly four core subjects.")
  ),
  strugglingSubjects: subjectList().pipe(
    z.array(z.enum(PROFILE_SUBJECTS)).min(1, "Select at least one subject you struggle with.")
  ),
  hasTakenCbt: requiredYesNo("Have you written a CBT before"),
  computerComfort: z.coerce
    .number({ error: "Computer comfort is required." })
    .int()
    .min(1, "Computer comfort must be between 1 and 5.")
    .max(5, "Computer comfort must be between 1 and 5."),
  jambYear: z.coerce
    .number({ error: "Planned JAMB year is required." })
    .pipe(z.union([z.literal(2026), z.literal(2027)], { error: "JAMB year must be 2026 or 2027." })),
  jambTargetScore: required("Target JAMB score"),
  attendedExtraLessons: requiredYesNo("Previous extra lessons"),
  biggestChallenge: optionalText(),
  strictCbtWilling: requiredYesNo("Strict CBT conditions"),
  followUpWilling: optionalYesNo,
  mocksCommitment: requiredYesNo("Mock exam commitment"),
  motivation: required("Reason for joining"),

  guardianName: required("Guardian name"),
  guardianAddress: required("Guardian address"),
  guardianPhone: required("Guardian phone number"),
  guardianEmail: optionalText().pipe(z.email("Guardian email isn't a valid address.").nullable()),
  guardianSupports: requiredYesNo("Guardian support"),
  dataConsent: requiredYesNo("Data consent"),

  additionalInfo: optionalText(),
  university: required("University"),
  course: required("Course"),
  status: z.enum(STATUSES).default("admitted"),
  dateJoined: requiredDate("Date joined"),
});

export type ProfileInput = z.output<typeof profileSchema>;

export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input.";
}

export function parseSubjects(json: string): string[] {
  try {
    const value = JSON.parse(json);
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

export function dateToInput(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function yesNoLabel(value: boolean | null) {
  if (value === null) return "—";
  return value ? "Yes" : "No";
}
