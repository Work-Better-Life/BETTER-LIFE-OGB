"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { guardWrite, requireWriter } from "@/lib/auth";
import * as scoresData from "@/lib/data/scores";
import * as subjectsData from "@/lib/data/subjects";

export type ActionState = { error?: string };

// A score above its own max would read as >100% and wreck every average and
// chart that uses it, so every entry path rejects it.
function overMaxMessage(value: number, maxScore: number) {
  return `A score of ${value} is higher than the max score of ${maxScore}.`;
}

const addScoreSchema = z.object({
  studentId: z.string().min(1),
  subjectId: z.string().min(1, "Choose a subject."),
  topicId: z.string().optional(),
  newTopicName: z.string().trim().optional(),
  value: z.coerce.number().min(0, "Score can't be negative."),
  maxScore: z.coerce.number().int().min(1, "Max score must be at least 1."),
  note: z.string().trim().optional(),
  recordedAt: z.string().min(1, "Pick a date."),
}).superRefine((data, ctx) => {
  if (data.value > data.maxScore) {
    ctx.addIssue({ code: "custom", path: ["value"], message: overMaxMessage(data.value, data.maxScore) });
  }
});

export async function addScoreAction(
  studentId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await guardWrite();
  if (denied) return { error: denied };

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
}).superRefine((data, ctx) => {
  if (data.value > data.maxScore) {
    ctx.addIssue({ code: "custom", path: ["value"], message: overMaxMessage(data.value, data.maxScore) });
  }
});

export async function updateScoreAction(
  id: string,
  studentId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await guardWrite();
  if (denied) return { error: denied };
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
}).superRefine((data, ctx) => {
  data.entries.forEach((entry, index) => {
    if (entry.value > data.maxScore) {
      ctx.addIssue({
        code: "custom",
        path: ["entries", index, "value"],
        message: overMaxMessage(entry.value, data.maxScore),
      });
    }
  });
});

export type BulkScoreInput = z.infer<typeof bulkScoreSchema>;
export type BulkScoreState = { error?: string; successCount?: number };

export async function addBulkScoreAction(input: BulkScoreInput): Promise<BulkScoreState> {
  const denied = await guardWrite();
  if (denied) return { error: denied };

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

const gridColumnSchema = z.object({
  subjectId: z.string().min(1),
  topicId: z.string().optional(),
  newTopicName: z.string().trim().optional(),
  maxScore: z.coerce.number().int().min(1, "Max score must be at least 1."),
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        value: z.coerce.number().min(0, "Scores can't be negative."),
      })
    )
    .min(1),
}).superRefine((data, ctx) => {
  data.entries.forEach((entry, index) => {
    if (entry.value > data.maxScore) {
      ctx.addIssue({
        code: "custom",
        path: ["entries", index, "value"],
        message: overMaxMessage(entry.value, data.maxScore),
      });
    }
  });
});

const gridScoreSchema = z.object({
  recordedAt: z.string().min(1, "Pick a date."),
  note: z.string().trim().optional(),
  columns: z.array(gridColumnSchema).min(1, "Enter at least one score."),
});

export type GridScoreInput = z.infer<typeof gridScoreSchema>;
export type GridScoreState = { error?: string; successCount?: number };

export async function addGridScoreAction(input: GridScoreInput): Promise<GridScoreState> {
  const denied = await guardWrite();
  if (denied) return { error: denied };

  const parsed = gridScoreSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { recordedAt, note, columns } = parsed.data;
  const date = new Date(recordedAt);

  const resolvedEntries: Array<{
    studentId: string;
    topicId: string;
    value: number;
    maxScore: number;
    note?: string;
    recordedAt: Date;
  }> = [];

  for (const column of columns) {
    let resolvedTopicId = column.topicId;
    if (!resolvedTopicId) {
      if (!column.newTopicName) {
        return { error: "Choose an existing topic or type a new one for each subject column." };
      }
      try {
        const topic = await subjectsData.createTopic(column.subjectId, column.newTopicName, column.maxScore);
        resolvedTopicId = topic.id;
      } catch {
        return { error: "A topic with that name already exists in one of the selected subjects." };
      }
    }
    for (const entry of column.entries) {
      resolvedEntries.push({
        studentId: entry.studentId,
        topicId: resolvedTopicId,
        value: entry.value,
        maxScore: column.maxScore,
        note,
        recordedAt: date,
      });
    }
  }

  await scoresData.addBulkScoreEntries(resolvedEntries);

  revalidatePath("/dashboard");
  revalidatePath("/students");
  const uniqueStudentIds = new Set(resolvedEntries.map((e) => e.studentId));
  for (const studentId of uniqueStudentIds) revalidatePath(`/students/${studentId}`);

  return { successCount: resolvedEntries.length };
}

export async function deleteScoreAction(id: string, studentId: string) {
  await requireWriter();
  await scoresData.deleteScoreEntry(id);
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/dashboard");
  revalidatePath("/students");
}
