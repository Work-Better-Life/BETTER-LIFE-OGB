"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { StudentAvatar } from "./student-avatar";
import { CameraDialog } from "./camera-dialog";
import { fileToPhotoDataUrl } from "@/lib/image";
import { savePhotoAction, removePhotoAction } from "@/lib/actions/photos";

export function PhotoUploader({
  studentId,
  name,
  photo,
}: {
  studentId: string;
  name: string;
  photo: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(dataUrl: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await savePhotoAction(studentId, dataUrl);
      if (result.error) setError(result.error);
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(undefined);

    try {
      save(await fileToPhotoDataUrl(file));
    } catch {
      setError("That file isn't an image we can read.");
    }
  }

  function handleRemove() {
    setError(undefined);
    startTransition(async () => {
      const result = await removePhotoAction(studentId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <StudentAvatar photo={photo} name={name} className={pending ? "opacity-60" : undefined} />
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="sr-only" tabIndex={-1} />
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
          {pending ? "Saving…" : "Upload"}
        </Button>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => setCameraOpen(true)}>
          Take photo
        </Button>
        {photo && !pending && (
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
            save(dataUrl);
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
