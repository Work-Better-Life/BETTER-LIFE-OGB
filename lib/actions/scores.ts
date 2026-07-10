"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import * as scoresData from "@/lib/data/scores";
import * as subjectsData from "@/lib/data/subjects";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export type ActionState = { error?: string };

const addScoreSchema = z.object({
  studentId: z.string().min(1),
  subjectId: z.string().min(1, "Choose a subject."),
  topicId: z.string().optional(),
  newTopicName: z.string().trim().optional(),
  value: z.coerce.number().min(0, "Score can't be negative."),
  maxScore: z.coerce.number().int().min(1, "Max score must be at least 1."),
  note: z.string().trim().optional(),
  recordedAt: z.string().min(1, "Pick a date."),
});

export async function addScoreAction(
  studentId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();

  const parsed = addScoreSchema.safeParse({
    studentId,
    subjectId: formData.get("subjectId"),
    topicId: formData.get("topicId") || undefined,
    newTopicName: formData.get("newTopicName") || undefined,
    value: formData.get("value"),
    maxScore: formData.get("maxScore"),
    note: formData.get("note") || undefined,
    recordedAt: formData.get("recordedAt"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { subjectId, topicId, newTopicName, value, maxScore, note, recordedAt } = parsed.data;

  let resolvedTopicId = topicId;
  if (!resolvedTopicId) {
    if (!newTopicName) {
      return { error: "Choose an existing topic or type a new one." };
    }
    try {
      const topic = await subjectsData.createTopic(subjectId, newTopicName, maxScore);
      resolvedTopicId = topic.id;
    } catch {
      return { error: "A topic with that name already exists in this subject." };
    }
  }

  await scoresData.addScoreEntry({
    studentId,
    topicId: resolvedTopicId,
    value,
    maxScore,
    note,
    recordedAt: new Date(recordedAt),
  });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/dashboard");
  revalidatePath("/students");
  return {};
}

const editScoreSchema = z.object({
  value: z.coerce.number().min(0, "Score can't be negative."),
  maxScore: z.coerce.number().int().min(1, "Max score must be at least 1."),
  note: z.string().trim().optional(),
  recordedAt: z.string().min(1, "Pick a date."),
});

export async function updateScoreAction(
  id: string,
  studentId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession();
  const parsed = editScoreSchema.safeParse({
    value: formData.get("value"),
    maxScore: formData.get("maxScore"),
    note: formData.get("note") || undefined,
    recordedAt: formData.get("recordedAt"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await scoresData.updateScoreEntry(id, {
    value: parsed.data.value,
    maxScore: parsed.data.maxScore,
    note: parsed.data.note,
    recordedAt: new Date(parsed.data.recordedAt),
  });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/dashboard");
  revalidatePath("/students");
  return {};
}

const bulkScoreSchema = z.object({
  subjectId: z.string().min(1, "Choose a subject."),
  topicId: z.string().optional(),
  newTopicName: z.string().trim().optional(),
  maxScore: z.coerce.number().int().min(1, "Max score must be at least 1."),
  recordedAt: z.string().min(1, "Pick a date."),
  note: z.string().trim().optional(),
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        value: z.coerce.number().min(0, "Scores can't be negative."),
      })
    )
    .min(1, "Select at least one student."),
});

export type BulkScoreInput = z.infer<typeof bulkScoreSchema>;
export type BulkScoreState = { error?: string; successCount?: number };

export async function addBulkScoreAction(input: BulkScoreInput): Promise<BulkScoreState> {
  await requireSession();

  const parsed = bulkScoreSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { subjectId, topicId, newTopicName, maxScore, recordedAt, note, entries } = parsed.data;

  let resolvedTopicId = topicId;
  if (!resolvedTopicId) {
    if (!newTopicName) {
      return { error: "Choose an existing topic or type a new one." };
    }
    try {
      const topic = await subjectsData.createTopic(subjectId, newTopicName, maxScore);
      resolvedTopicId = topic.id;
    } catch {
      return { error: "A topic with that name already exists in this subject." };
    }
  }

  const date = new Date(recordedAt);
  await scoresData.addBulkScoreEntries(
    entries.map((entry) => ({
      studentId: entry.studentId,
      topicId: resolvedTopicId!,
      value: entry.value,
      maxScore,
      note,
      recordedAt: date,
    }))
  );

  revalidatePath("/dashboard");
  revalidatePath("/students");
  for (const entry of entries) revalidatePath(`/students/${entry.studentId}`);

  return { successCount: entries.length };
}

export async function deleteScoreAction(id: string, studentId: string) {
  await requireSession();
  await scoresData.deleteScoreEntry(id);
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/dashboard");
  revalidatePath("/students");
}
