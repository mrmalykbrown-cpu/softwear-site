"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AIVoiceInput } from "@/components/ui/ai-voice-input";
import { CloseIcon } from "@/components/icons";

export type VoiceCommand =
  | "next"
  | "prev"
  | "play"
  | "pause"
  | "lyrics"
  | "theme";

/* --- minimal Web Speech API typings (not in lib.dom by default) --------- */
interface SpeechResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechEventLike {
  results: ArrayLike<SpeechResultLike>;
}
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => RecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function parseCommand(text: string): VoiceCommand | null {
  const s = text.toLowerCase();
  if (/\b(next|skip|forward)\b/.test(s)) return "next";
  if (/\b(prev|previous|back|last)\b/.test(s)) return "prev";
  if (/\b(pause|stop|hold)\b/.test(s)) return "pause";
  if (/\b(play|resume|unpause)\b/.test(s)) return "play";
  if (/\b(lyric|lyrics|words|sing)\b/.test(s)) return "lyrics";
  if (/\b(night|dark|day|light|theme|mode)\b/.test(s)) return "theme";
  return null;
}

const COMMANDS = ["next", "pause", "lyrics", "night"];

export function VoiceControl({
  open,
  onClose,
  onCommand,
}: {
  open: boolean;
  onClose: () => void;
  onCommand: (cmd: VoiceCommand) => void;
}) {
  const recRef = useRef<RecognitionLike | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [heard, setHeard] = useState<string>("");
  const supported = getRecognitionCtor() !== null;

  const stop = useCallback(() => {
    try {
      recRef.current?.abort();
    } catch {
      /* noop */
    }
    recRef.current = null;
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    stop();
    setHeard("");
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const transcript = last?.[0]?.transcript ?? "";
      setHeard(transcript);
      if (!last?.isFinal) return;
      const cmd = parseCommand(transcript);
      if (cmd) {
        onCommand(cmd);
        setHeard(`“${transcript.trim()}” ✓`);
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(onClose, 650);
      } else {
        setHeard(`“${transcript.trim()}” — try: ${COMMANDS.join(", ")}`);
      }
    };
    rec.onerror = () => setHeard("Didn't catch that — tap to try again");
    rec.onend = () => {
      recRef.current = null;
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      /* already started */
    }
  }, [onCommand, onClose, stop]);

  // Clean up when the overlay closes / unmounts.
  useEffect(() => {
    if (!open) {
      stop();
      setHeard("");
      if (closeTimer.current) clearTimeout(closeTimer.current);
    }
    return () => {
      stop();
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [open, stop]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* dismiss scrim */}
          <button
            aria-label="Close voice control"
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-label="Voice control"
            initial={{ scale: 0.9, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="glass relative w-full max-w-sm rounded-[2rem] p-6 text-center text-foreground"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 grid size-11 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/10"
            >
              <CloseIcon className="size-5" />
            </button>

            <p className="text-[17px] font-semibold tracking-[-0.01em]">
              Voice control
            </p>
            <p className="mx-auto mt-1 max-w-[18rem] text-[13px] leading-relaxed text-muted-foreground">
              {supported
                ? "Tap the mic, then say a command."
                : "Voice commands aren’t available on this device — but here’s the vibe."}
            </p>

            <AIVoiceInput
              onStart={start}
              onStop={stop}
              demoMode={!supported}
              className="mt-2"
            />

            <p
              aria-live="polite"
              className="min-h-[2.5rem] px-2 text-sm font-medium text-foreground/80"
            >
              {heard}
            </p>

            {/* command hints */}
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
              {COMMANDS.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1 text-xs font-medium capitalize text-foreground/70"
                >
                  {c}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
