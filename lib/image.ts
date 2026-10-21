// Browser-only helpers for the profile photo. Whatever the source (a file or a
// camera frame) is centre-cropped to a square and shrunk, so what's stored is
// ~20 KB regardless of what the camera produced.

const PHOTO_SIZE = 320;

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

export function videoFrameToPhotoDataUrl(video: HTMLVideoElement): string {
  return squareJpeg(video, video.videoWidth, video.videoHeight);
}
