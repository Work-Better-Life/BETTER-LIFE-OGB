"use server";

import { revalidatePath } from "next/cache";
import { guardWrite } from "@/lib/auth";
import { readSpreadsheet } from "@/lib/spreadsheet";
import {
  analyzeScoreImport,
  commitScoreImport,
  undoScoreImport,
  type ScoreImportReport,
} from "@/lib/data/score-import";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type ScoreImportResult =
  | { ok: false; error: string }
  | {
      ok: true;
      report: ScoreImportReport;
      // Set only when this call actually saved the scores.
      imported?: { entryCount: number; studentCount: number };
    };

function revalidateScoreViews(studentIds: string[]) {
  revalidatePath("/dashboard");
  revalidatePath("/students");
  revalidatePath("/scores/record");
  for (const id of studentIds) revalidatePath(`/students/${id}`);
}

// "preview" checks the file and writes nothing. "import" re-checks the same
// file from scratch (the browser's earlier preview is never trusted) and saves
// only when there isn't a single problem.
export async function importScoresAction(formData: FormData): Promise<ScoreImportResult> {
  const denied = await guardWrite();
  if (denied) return { ok: false, error: denied };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a spreadsheet file to import." };
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: "That file is too large (5 MB max)." };

  const sheet = readSpreadsheet(new Uint8Array(await file.arrayBuffer()));
  if (!sheet.ok) return sheet;

  const analysis = await analyzeScoreImport(sheet.table, {
    testName: formData.get("testName")?.toString() ?? "",
    date: formData.get("date")?.toString() ?? "",
    cohort: formData.get("cohort")?.toString() ?? "",
    fileName: file.name,
    sheetName: sheet.sheetName,
  });
  if (!analysis.ok) return analysis;

  if (formData.get("mode") !== "import" || !analysis.report.canImport) {
    return { ok: true, report: analysis.report };
  }

  try {
    const saved = await commitScoreImport(analysis.plan);
    revalidateScoreViews(saved.studentIds);
    return {
      ok: true,
      report: analysis.report,
      imported: { entryCount: saved.entryCount, studentCount: saved.studentIds.length },
    };
  } catch {
    return { ok: false, error: "Nothing was saved because something went wrong while writing the scores. Try again." };
  }
}

export async function undoScoreImportAction(id: string): Promise<{ error?: string; removed?: number }> {
  const denied = await guardWrite();
  if (denied) return { error: denied };

  try {
    const result = await undoScoreImport(id);
    revalidateScoreViews(result.studentIds);
    return { removed: result.removed };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't undo this import." };
  }
}
