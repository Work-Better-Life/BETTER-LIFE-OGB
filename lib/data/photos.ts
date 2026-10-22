import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { deleteUploadedFile } from "@/lib/storage";

// The address to show for a student's photo: the UploadThing URL, or the older
// inline data URL for photos saved before UploadThing was added.
export async function getPhoto(studentId: string) {
  const photo = await prisma.studentPhoto.findUnique({ where: { studentId }, select: { url: true, data: true } });
  return photo?.url ?? photo?.data ?? null;
}

// Points the student at a newly uploaded file and removes the one it replaces
// from UploadThing, so old photos don't pile up in storage.
export async function replacePhoto(studentId: string, file: { url: string; key: string }) {
  const previous = await prisma.studentPhoto.findUnique({ where: { studentId }, select: { key: true } });
  await prisma.studentPhoto.upsert({
    where: { studentId },
    update: { url: file.url, key: file.key, data: null },
    create: { studentId, url: file.url, key: file.key },
  });
  if (previous?.key && previous.key !== file.key) await deleteUploadedFile(previous.key);
}

export async function removePhoto(studentId: string) {
  const photo = await prisma.studentPhoto.findUnique({ where: { studentId }, select: { key: true } });
  await prisma.studentPhoto.deleteMany({ where: { studentId } });
  if (photo?.key) await deleteUploadedFile(photo.key);
}

// UploadThing keys of the photos belonging to the students matching `where`.
// Call this BEFORE deleting those students (deleting a student removes the
// photo record, and with it the only record of which file to delete), then pass
// the keys to deleteUploadedFiles once the delete has succeeded. `db` can be a
// transaction client.
export async function collectPhotoKeys(
  where: Prisma.StudentWhereInput,
  db: { studentPhoto: typeof prisma.studentPhoto } = prisma
) {
  const photos = await db.studentPhoto.findMany({ where: { student: where }, select: { key: true } });
  return photos.flatMap((photo) => (photo.key ? [photo.key] : []));
}
