"use client";

import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AIVoiceInputProps {
  onStart?: () => void;
  onStop?: (duration: number) => void;
  visualizerBars?: number;
  demoMode?: boolean;
  demoInterval?: number;
  className?: string;
}

export function AIVoiceInput({
  onStart,
  onStop,
  visualizerBars = 48,
  demoMode = false,
  demoInterval = 3000,
  className,
}: AIVoiceInputProps) {
  const [submitted, setSubmitted] = useState(false);
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isDemo, setIsDemo] = useState(demoMode);
  // Live bar levels (0–1) for a continuously fluid visualizer.
  const [levels, setLevels] = useState<number[]>(() =>
    Array(visualizerBars).fill(0)
  );
  const reduceMotion = useRef(false);

  useEffect(() => {
    setIsClient(true);
    reduceMotion.current =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (submitted) {
      onStart?.();
      intervalId = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      onStop?.(time);
      setTime(0);
    }

    return () => clearInterval(intervalId);
  }, [submitted, time, onStart, onStop]);

  // Fluid visualizer: morph the bar levels on a steady cadence while active;
  // the CSS height transition smooths the motion between frames. Honours
  // reduced-motion by holding a calm, static level instead of animating.
  useEffect(() => {
    if (!submitted || !isClient) {
      setLevels(Array(visualizerBars).fill(0));
      return;
    }
    if (reduceMotion.current) {
      setLevels(Array(visualizerBars).fill(0.5));
      return;
    }
    const id = setInterval(() => {
      setLevels(Array.from({ length: visualizerBars }, () => Math.random()));
    }, 120);
    return () => clearInterval(id);
  }, [submitted, isClient, visualizerBars]);

  useEffect(() => {
    if (!isDemo) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const runAnimation = () => {
      setSubmitted(true);
      timeoutId = setTimeout(() => {
        setSubmitted(false);
        timeoutId = setTimeout(runAnimation, 1000);
      }, demoInterval);
    };

    const initialTimeout = setTimeout(runAnimation, 100);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(initialTimeout);
    };
  }, [isDemo, demoInterval]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleClick = () => {
    if (isDemo) {
      setIsDemo(false);
      setSubmitted(false);
    } else {
      setSubmitted((prev) => !prev);
    }
  };

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative mx-auto flex w-full max-w-xl flex-col items-center gap-2">
        <button
          className={cn(
            "group flex h-16 w-16 items-center justify-center rounded-xl transition-colors duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
            submitted
              ? "bg-none"
              : "bg-none hover:bg-black/10 dark:hover:bg-white/10"
          )}
          type="button"
          onClick={handleClick}
        >
          {submitted ? (
            <div
              className="pointer-events-auto h-6 w-6 animate-spin cursor-pointer rounded-sm bg-black dark:bg-white"
              style={{ animationDuration: "3s" }}
            />
          ) : (
            <Mic className="h-6 w-6 text-black/70 dark:text-white/70" />
          )}
        </button>

        <span
          className={cn(
            "font-mono text-sm tabular-nums transition-opacity duration-300",
            submitted
              ? "text-black/70 dark:text-white/70"
              : "text-black/30 dark:text-white/30"
          )}
        >
          {formatTime(time)}
        </span>

        <div className="flex h-5 w-full max-w-[16rem] items-center justify-center gap-0.5">
          {[...Array(visualizerBars)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-0.5 rounded-full transition-[height,background-color] duration-300 ease-out",
                submitted
                  ? "bg-black/60 dark:bg-white/60"
                  : "h-1 bg-black/10 dark:bg-white/10"
              )}
              style={
                submitted && isClient
                  ? { height: `${20 + levels[i] * 80}%` }
                  : undefined
              }
            />
          ))}
        </div>

        <p className="h-4 text-xs text-black/70 dark:text-white/70">
          {submitted ? "Listening..." : "Click to speak"}
        </p>
      </div>
    </div>
  );
}
