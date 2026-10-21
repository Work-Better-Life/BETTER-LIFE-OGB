"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { guardWrite, requireWriter } from "@/lib/auth";
import * as subjectsData from "@/lib/data/subjects";

export type ActionState = { error?: string };

const subjectSchema = z.object({
  name: z.string().trim().min(1, "Subject name is required."),
});

export async function createSubjectAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await guardWrite();
  if (denied) return { error: denied };
  const parsed = subjectSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    await subjectsData.createSubject(parsed.data.name);
  } catch {
    return { error: "A subject with that name already exists." };
  }
  revalidatePath("/subjects");
  return {};
}

export async function updateSubjectAction(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await guardWrite();
  if (denied) return { error: denied };
  const parsed = subjectSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    await subjectsData.updateSubject(id, parsed.data.name);
  } catch {
    return { error: "A subject with that name already exists." };
  }
  revalidatePath("/subjects");
  return {};
}

export async function deleteSubjectAction(id: string) {
  await requireWriter();
  await subjectsData.deleteSubject(id);
  revalidatePath("/subjects");
  revalidatePath("/dashboard");
}

const topicSchema = z.object({
  name: z.string().trim().min(1, "Topic name is required."),
  defaultMaxScore: z.coerce.number().int().min(1, "Max score must be at least 1."),
});

export async function createTopicAction(
  subjectId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await guardWrite();
  if (denied) return { error: denied };
  const parsed = topicSchema.safeParse({
    name: formData.get("name"),
    defaultMaxScore: formData.get("defaultMaxScore"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    await subjectsData.createTopic(subjectId, parsed.data.name, parsed.data.defaultMaxScore);
  } catch {
    return { error: "A topic with that name already exists in this subject." };
  }
  revalidatePath("/subjects");
  return {};
}

export async function updateTopicAction(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await guardWrite();
  if (denied) return { error: denied };
  const parsed = topicSchema.safeParse({
    name: formData.get("name"),
    defaultMaxScore: formData.get("defaultMaxScore"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    await subjectsData.updateTopic(id, parsed.data.name, parsed.data.defaultMaxScore);
  } catch {
    return { error: "A topic with that name already exists in this subject." };
  }
  revalidatePath("/subjects");
  return {};
}

export async function deleteTopicAction(id: string) {
  await requireWriter();
  await subjectsData.deleteTopic(id);
  revalidatePath("/subjects");
  revalidatePath("/dashboard");
}
