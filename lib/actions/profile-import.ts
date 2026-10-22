"use server";

import { revalidatePath } from "next/cache";
import { guardWrite } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NEW_COHORT_VALUE } from "@/lib/data/cohorts";
import {
  analyzeStudentImport,
  commitStudentImport,
  undoStudentImport,
  type CohortSelection,
  type StudentImportReport,
} from "@/lib/data/profile-import";
import { readSpreadsheet } from "@/lib/spreadsheet";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type StudentImportResult =
  | { ok: false; error: string }
  | {
      ok: true;
      report: StudentImportReport;
      // Set only when this call actually saved the students.
      imported?: { created: number };
    };

async function resolveCohort(selection: string, newName: string): Promise<CohortSelection | { error: string }> {
  if (selection === "") return { kind: "none" };
  if (selection === NEW_COHORT_VALUE) {
    const name = newName.trim();
    if (!name) return { error: "Type a name for the new cohort." };
    if (name.length > 60) return { error: "Cohort names can be up to 60 characters." };
    // Reuse a cohort that already has this name rather than making a twin.
    const match = (await prisma.cohort.findMany()).find((c) => c.name.toLowerCase() === name.toLowerCase());
    return match ? { kind: "existing", id: match.id, name: match.name } : { kind: "new", name };
  }
  const cohort = await prisma.cohort.findUnique({ where: { id: selection } });
  if (!cohort) return { error: "That cohort no longer exists." };
  return { kind: "existing", id: cohort.id, name: cohort.name };
}

// "preview" checks the file and writes nothing. "import" re-checks the same file
// from scratch (the browser's earlier preview is never trusted) and saves only
// when there isn't a single problem.
export async function importStudentsAction(formData: FormData): Promise<StudentImportResult> {
  const denied = await guardWrite();
  if (denied) return { ok: false, error: denied };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a spreadsheet file to import." };
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: "That file is too large (5 MB max)." };

  const cohort = await resolveCohort(formData.get("cohortId")?.toString() ?? "", formData.get("newCohortName")?.toString() ?? "");
  if ("error" in cohort) return { ok: false, error: cohort.error };

  const sheet = readSpreadsheet(new Uint8Array(await file.arrayBuffer()));
  if (!sheet.ok) return sheet;

  const dateOrder = formData.get("dateOrder") === "mdy" ? "mdy" : "dmy";
  const { report, plan } = await analyzeStudentImport(sheet.table, {
    dateOrder,
    cohort,
    fileName: file.name,
    sheetName: sheet.sheetName,
  });

  if (formData.get("mode") !== "import" || !report.canImport) return { ok: true, report };

  try {
    const saved = await commitStudentImport(plan);
    revalidatePath("/students");
    revalidatePath("/students/import");
    revalidatePath("/students/cohorts");
    revalidatePath("/dashboard");
    return { ok: true, report, imported: { created: saved.created } };
  } catch {
    return { ok: false, error: "Nothing was saved because something went wrong while creating the students. Try again." };
  }
}

export async function undoStudentImportAction(id: string): Promise<{ error?: string; removed?: number }> {
  const denied = await guardWrite();
  if (denied) return { error: denied };

  try {
    const result = await undoStudentImport(id);
    revalidatePath("/students");
    revalidatePath("/students/import");
    revalidatePath("/students/cohorts");
    revalidatePath("/dashboard");
    return { removed: result.removed };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't undo this import." };
  }
}
