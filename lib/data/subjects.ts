import { prisma } from "@/lib/db";

export async function listSubjectsWithTopics() {
  return prisma.subject.findMany({
    include: {
      topics: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { scores: true } } },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function listSubjectsForPicker() {
  return prisma.subject.findMany({
    include: { topics: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
}

export async function createSubject(name: string) {
  return prisma.subject.create({ data: { name: name.trim() } });
}

export async function updateSubject(id: string, name: string) {
  return prisma.subject.update({ where: { id }, data: { name: name.trim() } });
}

export async function deleteSubject(id: string) {
  return prisma.subject.delete({ where: { id } });
}

export async function countScoresForSubject(id: string) {
  return prisma.scoreEntry.count({ where: { topic: { subjectId: id } } });
}

export async function createTopic(subjectId: string, name: string, defaultMaxScore: number) {
  return prisma.topic.create({
    data: { subjectId, name: name.trim(), defaultMaxScore },
  });
}

export async function updateTopic(id: string, name: string, defaultMaxScore: number) {
  return prisma.topic.update({
    where: { id },
    data: { name: name.trim(), defaultMaxScore },
  });
}

export async function deleteTopic(id: string) {
  return prisma.topic.delete({ where: { id } });
}

export async function countScoresForTopic(id: string) {
  return prisma.scoreEntry.count({ where: { topicId: id } });
}
