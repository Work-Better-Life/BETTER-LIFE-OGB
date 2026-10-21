"use server";

import { revalidatePath } from "next/cache";
import { guardWrite } from "@/lib/auth";
import * as photosData from "@/lib/data/photos";

// The browser resizes to ~320px before sending, so real uploads are tiny.
// This cap just stops anything else from filling the database.
const MAX_DATA_URL_LENGTH = 200_000;
const JPEG_DATA_URL = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/;

export type PhotoActionResult = { error?: string };

export async function savePhotoAction(studentId: string, dataUrl: string): Promise<PhotoActionResult> {
  const denied = await guardWrite();
  if (denied) return { error: denied };

  if (dataUrl.length > MAX_DATA_URL_LENGTH || !JPEG_DATA_URL.test(dataUrl)) {
    return { error: "That image couldn't be used. Try a different photo." };
  }

  await photosData.setPhoto(studentId, dataUrl);
  revalidatePath(`/students/${studentId}/profile`);
  return {};
}

export async function removePhotoAction(studentId: string): Promise<PhotoActionResult> {
  const denied = await guardWrite();
  if (denied) return { error: denied };

  await photosData.removePhoto(studentId);
  revalidatePath(`/students/${studentId}/profile`);
  return {};
}
