"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import * as studentsData from "@/lib/data/students";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

const studentSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
});

export type StudentFormState = { error?: string };

export async function createStudentAction(
  _prev: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  await requireSession();
  const parsed = studentSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  await studentsData.createStudent(parsed.data.firstName, parsed.data.lastName);
  revalidatePath("/students");
  revalidatePath("/dashboard");
  return {};
}

export async function updateStudentAction(
  id: string,
  _prev: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  await requireSession();
  const parsed = studentSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  await studentsData.updateStudent(id, parsed.data.firstName, parsed.data.lastName);
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  return {};
}

export async function deleteStudentAction(id: string) {
  await requireSession();
  await studentsData.deleteStudent(id);
  revalidatePath("/students");
  revalidatePath("/dashboard");
}
