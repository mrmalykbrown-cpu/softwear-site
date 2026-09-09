"use client";

import { useRef, useState } from "react";
import { Camera, ImageUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Label } from "@/components/ui/card";
import { ACCEPTED_TYPES, ImageError, compressScreenshot } from "@/lib/image";
import { cn } from "@/lib/utils";

export function UploadStep({
  onSubmit,
  disabled,
}: {
  onSubmit: (image: string, notes: string) => void;
  disabled?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  async function accept(file: File | undefined) {
    if (!file) return;
    setError(null);
    setWorking(true);
    try {
      setPreview(await compressScreenshot(file));
    } catch (cause) {
      setError(cause instanceof ImageError ? cause.message : "We couldn't read that file.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void accept(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "rounded-[12px] border border-dashed bg-navy-900 transition-colors",
          dragging ? "border-blue-400" : "border-navy-800",
        )}
      >
        {preview ? (
          <div className="p-4">
            {/* A local data URL: next/image would add an optimiser round-trip
                for an image that never leaves the device until submit. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Your uploaded odds screenshot"
              className="mx-auto max-h-80 w-auto rounded-lg border border-navy-800"
            />
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setError(null);
              }}
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-slate-400 hover:text-slate-100"
            >
              <X className="size-4" />
              Choose a different screenshot
            </button>
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <ImageUp className="mx-auto size-8 text-slate-400" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium text-slate-100">
              Drop your odds screenshot here
            </p>
            <p className="mt-1 text-xs text-slate-400">
              PNG, JPG or WebP. Compressed on your device before it is sent.
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => fileInput.current?.click()}
                disabled={working}
              >
                {working ? "Preparing…" : "Choose a file"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => cameraInput.current?.click()}
                disabled={working}
                className="sm:hidden"
              >
                <Camera className="size-4" />
                Take a photo
              </Button>
            </div>
          </div>
        )}

        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="sr-only"
          onChange={(event) => void accept(event.target.files?.[0])}
        />
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => void accept(event.target.files?.[0])}
        />
      </div>

      {error ? <p className="mt-3 text-sm text-negative">{error}</p> : null}

      <div className="mt-6">
        <Label htmlFor="notes">Anything we should know?</Label>
        <Textarea
          id="notes"
          value={notes}
          maxLength={1000}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Injuries, weather, lineup news."
          className="mt-2"
        />
      </div>

      <Button
        size="lg"
        className="mt-6 w-full"
        disabled={!preview || disabled || working}
        onClick={() => preview && onSubmit(preview, notes)}
      >
        Analyze this match
      </Button>
    </div>
  );
}
