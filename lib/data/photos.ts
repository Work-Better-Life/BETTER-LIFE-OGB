import { prisma } from "@/lib/db";

export async function getPhoto(studentId: string) {
  const photo = await prisma.studentPhoto.findUnique({ where: { studentId }, select: { data: true } });
  return photo?.data ?? null;
}

export async function setPhoto(studentId: string, data: string) {
  return prisma.studentPhoto.upsert({
    where: { studentId },
    update: { data },
    create: { studentId, data },
  });
}

export async function removePhoto(studentId: string) {
  await prisma.studentPhoto.deleteMany({ where: { studentId } });
}
