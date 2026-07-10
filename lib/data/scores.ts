import { prisma } from "@/lib/db";

export async function addScoreEntry(input: {
  studentId: string;
  topicId: string;
  value: number;
  maxScore: number;
  note?: string | null;
  recordedAt: Date;
}) {
  return prisma.scoreEntry.create({
    data: {
      studentId: input.studentId,
      topicId: input.topicId,
      value: input.value,
      maxScore: input.maxScore,
      note: input.note ?? null,
      recordedAt: input.recordedAt,
    },
  });
}

export async function addBulkScoreEntries(
  entries: Array<{
    studentId: string;
    topicId: string;
    value: number;
    maxScore: number;
    note?: string | null;
    recordedAt: Date;
  }>
) {
  return prisma.$transaction(
    entries.map((entry) =>
      prisma.scoreEntry.create({
        data: {
          studentId: entry.studentId,
          topicId: entry.topicId,
          value: entry.value,
          maxScore: entry.maxScore,
          note: entry.note ?? null,
          recordedAt: entry.recordedAt,
        },
      })
    )
  );
}

export async function updateScoreEntry(
  id: string,
  input: { value: number; maxScore: number; note?: string | null; recordedAt: Date }
) {
  return prisma.scoreEntry.update({
    where: { id },
    data: {
      value: input.value,
      maxScore: input.maxScore,
      note: input.note ?? null,
      recordedAt: input.recordedAt,
    },
  });
}

export async function deleteScoreEntry(id: string) {
  return prisma.scoreEntry.delete({ where: { id } });
}

export async function getScoreEntry(id: string) {
  return prisma.scoreEntry.findUnique({
    where: { id },
    include: { topic: { include: { subject: true } }, student: true },
  });
}
