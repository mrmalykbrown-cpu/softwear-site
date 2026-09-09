"use client";

import { Check } from "lucide-react";
import { Crosshair } from "@/components/brand/crosshair";
import { cn } from "@/lib/utils";

export const STAGES = [
  { key: "reading", label: "Reading the odds" },
  { key: "identifying", label: "Identifying the match" },
  { key: "researching", label: "Pulling form and team news" },
  { key: "calculating", label: "Calculating edge" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

/**
 * Progress during analysis.
 *
 * Each line lights up when the server says that stage has actually started, not
 * on a timer. If the research phase takes eighteen seconds, this sits on
 * "Pulling form and team news" for eighteen seconds — which is honest, and
 * which is why the copy says what it is doing rather than "Almost there".
 */
export function ProcessingStep({
  stage,
  match,
}: {
  stage: StageKey;
  match?: { homeTeam: string; awayTeam: string } | null;
}) {
  const currentIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <div
      className="flex flex-col items-center rounded-[12px] border border-navy-800 bg-navy-900 px-6 py-14"
      role="status"
      aria-live="polite"
    >
      <Crosshair className="size-14 text-blue-400" spinning />

      <p className="mt-6 text-base font-medium text-slate-100">
        {match ? `${match.homeTeam} v ${match.awayTeam}` : "Analyzing your screenshot"}
      </p>
      <p className="mt-1 text-sm text-slate-400">Usually twenty to forty seconds.</p>

      <ol className="mt-8 w-full max-w-xs space-y-3">
        {STAGES.map((item, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;

          return (
            <li key={item.key} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  done
                    ? "border-positive bg-positive/15 text-positive"
                    : active
                      ? "border-blue-400 text-blue-400"
                      : "border-navy-800 text-navy-800",
                )}
                aria-hidden="true"
              >
                {done ? (
                  <Check className="size-3" />
                ) : (
                  <span
                    className={cn("size-1.5 rounded-full", active ? "bg-blue-400" : "bg-navy-800")}
                  />
                )}
              </span>
              <span
                className={cn(
                  "text-sm",
                  done ? "text-slate-400" : active ? "text-slate-100" : "text-navy-800",
                )}
              >
                {item.label}
                {active ? "…" : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
