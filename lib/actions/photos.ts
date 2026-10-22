"use server";

import { revalidatePath } from "next/cache";
import { guardWrite } from "@/lib/auth";
import * as photosData from "@/lib/data/photos";

export type PhotoActionResult = { error?: string };

// Photos are saved by UploadThing's route (lib/uploadthing.ts), not by a server
// action. Removal still goes through here: it deletes the stored file and the
// record.
export async function removePhotoAction(studentId: string): Promise<PhotoActionResult> {
  const denied = await guardWrite();
  if (denied) return { error: denied };

  await photosData.removePhoto(studentId);
  revalidatePath(`/students/${studentId}/profile`);
  return {};
}
