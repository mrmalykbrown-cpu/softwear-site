"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { UploadStep } from "@/components/analyze/upload-step";
import { ProcessingStep, type StageKey } from "@/components/analyze/processing-step";

type Phase =
  | { name: "upload" }
  | { name: "processing"; stage: StageKey; match: { homeTeam: string; awayTeam: string } | null }
  | { name: "error"; message: string; retryable: boolean; upgrade?: boolean };

type StreamEvent = {
  stage: StageKey | "done" | "error";
  homeTeam?: string;
  awayTeam?: string;
  analysisId?: string;
  message?: string;
  retryable?: boolean;
};

/**
 * The three-step analysis flow.
 *
 * On success this navigates to /analyze/[id] rather than rendering results in
 * place: the analysis is a real record, so its results should have a real URL
 * that survives a refresh, a back button and being sent to someone.
 */
export function AnalyzeFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: "upload" });
  const running = useRef(false);

  const start = useCallback(
    async (image: string, notes: string) => {
      if (running.current) return;
      running.current = true;
      setPhase({ name: "processing", stage: "reading", match: null });

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image, notes: notes.trim() || undefined }),
        });

        // Rejections before the stream opens (auth, plan, rate limit) come back
        // as ordinary JSON with a status code.
        if (!response.ok || !response.body) {
          const body = await response.json().catch(() => null);
          setPhase({
            name: "error",
            message: body?.error ?? "We couldn't start the analysis. Try again.",
            retryable: response.status !== 402,
            upgrade: response.status === 402,
          });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // Newline-delimited JSON: a chunk may split a line, so only whole lines
        // are parsed and the remainder is carried forward.
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;

            let event: StreamEvent;
            try {
              event = JSON.parse(line) as StreamEvent;
            } catch {
              continue;
            }

            if (event.stage === "done" && event.analysisId) {
              router.push(`/analyze/${event.analysisId}`);
              return;
            }

            if (event.stage === "error") {
              setPhase({
                name: "error",
                message: event.message ?? "Something went wrong.",
                retryable: event.retryable ?? true,
              });
              return;
            }

            setPhase((current) => ({
              name: "processing",
              stage: event.stage as StageKey,
              match:
                event.homeTeam && event.awayTeam
                  ? { homeTeam: event.homeTeam, awayTeam: event.awayTeam }
                  : current.name === "processing"
                    ? current.match
                    : null,
            }));
          }
        }

        // The stream ended without a terminal event — a dropped connection.
        setPhase({
          name: "error",
          message: "The connection dropped before the analysis finished. Try again.",
          retryable: true,
        });
      } catch {
        setPhase({
          name: "error",
          message: "We lost the connection. Check your network and try again.",
          retryable: true,
        });
      } finally {
        running.current = false;
      }
    },
    [router],
  );

  if (phase.name === "processing") {
    return <ProcessingStep stage={phase.stage} match={phase.match} />;
  }

  if (phase.name === "error") {
    return (
      <div className="rounded-[12px] border border-navy-800 bg-navy-900 px-6 py-12 text-center">
        <h2 className="text-base font-semibold text-slate-100">
          {phase.upgrade ? "Your plan has lapsed" : "That didn't work"}
        </h2>
        <p className="prose-measure mx-auto mt-2 text-sm leading-relaxed text-slate-400">
          {phase.message}
        </p>

        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {phase.upgrade ? (
            <ButtonLink href="/upgrade" size="lg">
              See your options
            </ButtonLink>
          ) : null}
          {phase.retryable ? (
            <Button size="lg" variant="secondary" onClick={() => setPhase({ name: "upload" })}>
              Try another screenshot
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return <UploadStep onSubmit={(image, notes) => void start(image, notes)} />;
}
