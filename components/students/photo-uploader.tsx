"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StudentAvatar } from "./student-avatar";
import { CameraDialog } from "./camera-dialog";
import { MAX_PHOTO_SOURCE_BYTES, MAX_PHOTO_UPLOAD_BYTES, dataUrlToFile, fileToPhotoDataUrl } from "@/lib/image";
import { useUploadThing } from "@/lib/uploadthing-client";
import { removePhotoAction } from "@/lib/actions/photos";

export function PhotoUploader({
  studentId,
  name,
  photo,
}: {
  studentId: string;
  name: string;
  photo: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [removing, startRemoving] = useTransition();

  const { startUpload, isUploading } = useUploadThing("studentPhoto", {
    onClientUploadComplete: () => router.refresh(),
    onUploadError: (e) => setError(e.message || "The upload failed. Try again."),
  });
  const busy = isUploading || removing;

  // Every photo, from a file or the camera, is cropped square and shrunk first,
  // so what's uploaded is a ~20 KB JPEG whatever the source was.
  async function upload(dataUrl: string) {
    setError(undefined);
    const file = await dataUrlToFile(dataUrl);
    if (file.size > MAX_PHOTO_UPLOAD_BYTES) {
      setError("That photo is still too large after shrinking it. Try a different one.");
      return;
    }
    await startUpload([file], { studentId });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(undefined);

    if (file.size > MAX_PHOTO_SOURCE_BYTES) {
      setError(`That photo is ${(file.size / 1024 / 1024).toFixed(1)} MB. Choose one under 1 MB.`);
      return;
    }

    let dataUrl: string;
    try {
      dataUrl = await fileToPhotoDataUrl(file);
    } catch {
      setError("That file isn't an image we can read.");
      return;
    }
    await upload(dataUrl);
  }

  function handleRemove() {
    setError(undefined);
    startRemoving(async () => {
      const result = await removePhotoAction(studentId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <StudentAvatar photo={photo} name={name} className={busy ? "opacity-60" : undefined} />
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="sr-only" tabIndex={-1} />
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {isUploading ? "Uploading…" : "Upload"}
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => setCameraOpen(true)}>
          Take photo
        </Button>
        {photo && !busy && (
          <Button variant="ghost" size="sm" onClick={handleRemove}>
            Remove
          </Button>
        )}
      </div>
      {cameraOpen && (
        <CameraDialog
          onClose={() => setCameraOpen(false)}
          onUse={(dataUrl) => {
            setCameraOpen(false);
            void upload(dataUrl);
          }}
        />
      )}
      {error && (
        <p role="alert" className="max-w-40 text-center text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
