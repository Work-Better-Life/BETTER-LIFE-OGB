"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { videoFrameToPhotoDataUrl } from "@/lib/image";

type Facing = "user" | "environment";

function describeCameraError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access was blocked. Allow it in your browser's site settings, or upload a file instead.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera was found on this device.";
  }
  if (name === "NotReadableError") {
    return "The camera is being used by another app.";
  }
  return "Couldn't start the camera.";
}

// Mount this only while it should be open: it starts the camera on mount and
// releases it on unmount, so a closed dialog never holds the camera.
export function CameraDialog({ onClose, onUse }: { onClose: () => void; onUse: (dataUrl: string) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"starting" | "live" | "error">("starting");
  const [error, setError] = useState<string>();
  const [facing, setFacing] = useState<Facing>("user");
  const [captured, setCaptured] = useState<string | null>(null);
  // Only rendered after a click, so navigator is always available here. The
  // camera API is missing on insecure (plain http) pages.
  const unsupported = !navigator.mediaDevices?.getUserMedia;
  const shownStatus = unsupported ? "error" : status;
  const shownError = unsupported
    ? "The camera isn't available here — it needs a secure (https) connection."
    : error;

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function attachStream(stream: MediaStream) {
    stopStream();
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);
    }
  }

  function openStream(next: Facing) {
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: next, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  }

  useEffect(() => {
    dialogRef.current?.showModal();
    if (unsupported) return;

    let cancelled = false;
    openStream("user")
      .then(async (stream) => {
        if (cancelled) return stream.getTracks().forEach((track) => track.stop());
        await attachStream(stream);
        setStatus("live");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(describeCameraError(e));
        setStatus("error");
      });

    return () => {
      cancelled = true;
      stopStream();
    };
    // Runs once on mount; the helpers only touch refs and stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flip() {
    const next: Facing = facing === "user" ? "environment" : "user";
    setFacing(next);
    setStatus("starting");
    openStream(next)
      .then(attachStream)
      .then(() => setStatus("live"))
      .catch((e) => {
        setError(describeCameraError(e));
        setStatus("error");
      });
  }

  function capture() {
    if (!videoRef.current) return;
    setCaptured(videoRef.current.videoWidth > 0 ? videoFrameToPhotoDataUrl(videoRef.current) : null);
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(92vw,26rem)] rounded-lg border border-border bg-surface p-5 text-foreground backdrop:bg-black/50"
    >
      <h2 className="font-display text-lg">Take a photo</h2>

      <div className="relative mt-4 aspect-square overflow-hidden rounded-md bg-surface-muted">
        <video
          ref={videoRef}
          playsInline
          muted
          className="size-full object-cover"
          hidden={captured !== null || shownStatus === "error"}
        />
        {captured && (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
          <img src={captured} alt="Captured preview" className="size-full object-cover" />
        )}
        {shownStatus === "starting" && !captured && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-foreground-muted">
            Starting camera…
          </p>
        )}
        {shownStatus === "error" && (
          <p role="alert" className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-danger">
            {shownError}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {captured ? (
          <>
            <Button variant="ghost" onClick={() => setCaptured(null)}>
              Retake
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => onUse(captured)}>Use photo</Button>
            </div>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={flip} disabled={shownStatus !== "live"}>
              Flip camera
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={capture} disabled={shownStatus !== "live"}>
                Capture
              </Button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
