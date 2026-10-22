// Browser-only helpers for the profile photo. Whatever the source (a file or a
// camera frame) is centre-cropped to a square and shrunk, so what's stored is
// ~20 KB regardless of what the camera produced.

const PHOTO_SIZE = 320;

// The largest photo a person may pick, and the largest file actually sent to
// storage (the picked photo is shrunk first, so the second is far smaller in
// practice). Keep the second in step with the cap in lib/uploadthing.ts.
export const MAX_PHOTO_SOURCE_BYTES = 1024 * 1024;
export const MAX_PHOTO_UPLOAD_BYTES = 1024 * 1024;

function squareJpeg(source: CanvasImageSource, width: number, height: number): string {
  const side = Math.min(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(source, (width - side) / 2, (height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export async function fileToPhotoDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    return squareJpeg(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

// Turns a data URL (what the crop/resize produces) into a File to hand to the uploader.
export async function dataUrlToFile(dataUrl: string, filename = "photo.jpg"): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], filename, { type: "image/jpeg" });
}

export function videoFrameToPhotoDataUrl(video: HTMLVideoElement): string {
  return squareJpeg(video, video.videoWidth, video.videoHeight);
}
