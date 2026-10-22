"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guardWrite } from "@/lib/auth";
import * as cohortsData from "@/lib/data/cohorts";

export type CohortActionState = { error?: string };

const nameSchema = z.string().trim().min(1, "Cohort name is required.").max(60, "Cohort names can be up to 60 characters.");

function revalidateCohortViews() {
  revalidatePath("/students");
  revalidatePath("/students/cohorts");
}

export async function createCohortAction(_prev: CohortActionState, formData: FormData): Promise<CohortActionState> {
  const denied = await guardWrite();
  if (denied) return { error: denied };

  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) return { error: name.error.issues[0]?.message ?? "Invalid name." };

  await cohortsData.findOrCreateCohort(name.data);
  revalidateCohortViews();
  return {};
}

export async function renameCohortAction(
  id: string,
  _prev: CohortActionState,
  formData: FormData
): Promise<CohortActionState> {
  const denied = await guardWrite();
  if (denied) return { error: denied };

  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) return { error: name.error.issues[0]?.message ?? "Invalid name." };

  try {
    await cohortsData.renameCohort(id, name.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't rename this cohort." };
  }
  revalidateCohortViews();
  return {};
}

export async function deleteCohortAction(id: string): Promise<CohortActionState> {
  const denied = await guardWrite();
  if (denied) return { error: denied };

  try {
    await cohortsData.deleteCohort(id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't delete this cohort." };
  }
  revalidateCohortViews();
  return {};
}

// Moves the given students into a cohort (or out of any cohort when
// `selection` is ""). Used by the bulk "Move to cohort" bar on the students list.
export async function assignCohortAction(
  studentIds: string[],
  selection: string,
  newName?: string
): Promise<CohortActionState & { moved?: number }> {
  const denied = await guardWrite();
  if (denied) return { error: denied };
  if (studentIds.length === 0) return { error: "Select at least one student." };

  const resolved = await cohortsData.resolveCohortSelection(selection, newName);
  if ("error" in resolved) return { error: resolved.error };

  const moved = await cohortsData.assignStudentsToCohort(studentIds, resolved.cohortId);
  revalidatePath("/students");
  revalidatePath("/students/cohorts");
  for (const id of studentIds) revalidatePath(`/students/${id}`);
  return { moved };
}
