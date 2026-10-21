"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { guardWrite, requireWriter } from "@/lib/auth";
import * as studentsData from "@/lib/data/students";
import { resolveCohortSelection } from "@/lib/data/cohorts";

const studentSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
});

export type StudentFormState = { error?: string };

export async function createStudentAction(
  _prev: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const denied = await guardWrite();
  if (denied) return { error: denied };
  const parsed = studentSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const cohort = await resolveCohortSelection(
    formData.get("cohortId")?.toString() ?? "",
    formData.get("newCohortName")?.toString()
  );
  if ("error" in cohort) return { error: cohort.error };

  await studentsData.createStudent(parsed.data.firstName, parsed.data.lastName, cohort.cohortId);
  revalidatePath("/students");
  revalidatePath("/dashboard");
  return {};
}

export async function updateStudentAction(
  id: string,
  _prev: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const denied = await guardWrite();
  if (denied) return { error: denied };
  const parsed = studentSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  // Only touch the cohort when the form actually sent the field.
  let cohortId: string | null | undefined;
  if (formData.has("cohortId")) {
    const cohort = await resolveCohortSelection(
      formData.get("cohortId")?.toString() ?? "",
      formData.get("newCohortName")?.toString()
    );
    if ("error" in cohort) return { error: cohort.error };
    cohortId = cohort.cohortId;
  }

  await studentsData.updateStudent(id, parsed.data.firstName, parsed.data.lastName, cohortId);
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  return {};
}

export async function deleteStudentAction(id: string) {
  await requireWriter();
  await studentsData.deleteStudent(id);
  revalidatePath("/students");
  revalidatePath("/dashboard");
}
