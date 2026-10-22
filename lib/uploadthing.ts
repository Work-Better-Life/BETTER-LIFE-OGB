import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionFromRequest, VIEW_ONLY_MESSAGE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { replacePhoto } from "@/lib/data/photos";

const f = createUploadthing();

export const uploadRouter = {
  // The browser shrinks every photo to a ~320px JPEG (about 20 KB) before
  // uploading, so 1 MB is far more than a real upload needs; the cap is there
  // for anything that bypasses the browser. JPEG only, one file per upload.
  studentPhoto: f({ "image/jpeg": { maxFileSize: "1MB", maxFileCount: 1 } })
    .input(z.object({ studentId: z.string().min(1) }))
    .middleware(async ({ req, input }) => {
      // The real gate: signed in, allowed to edit, and the student exists.
      const session = await getSessionFromRequest(req);
      if (!session) throw new UploadThingError({ code: "FORBIDDEN", message: "You need to be signed in to upload a photo." });
      if (!session.canWrite) throw new UploadThingError({ code: "FORBIDDEN", message: VIEW_ONLY_MESSAGE });

      const student = await prisma.student.findUnique({ where: { id: input.studentId }, select: { id: true } });
      if (!student) throw new UploadThingError({ code: "NOT_FOUND", message: "That student no longer exists." });
      return { studentId: student.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Runs on our server once UploadThing has the file; this is what records it.
      await replacePhoto(metadata.studentId, { url: file.ufsUrl, key: file.key });
      revalidatePath(`/students/${metadata.studentId}/profile`);
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
