"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Outcome } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Marking a bet.
 *
 * Won and Lost are the two real buttons. Void exists because bookmakers void
 * bets and pretending otherwise would corrupt the history; it is deliberately
 * quieter. Everything stays changeable for 24 hours, after which the server
 * refuses the edit and this hides the controls.
 */
export function SettleControls({
  recommendationId,
  outcome,
  editable,
}: {
  recommendationId: string;
  outcome: Outcome;
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mark(next: Outcome) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/recommendations/${recommendationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome: next }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "We couldn't save that.");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("We couldn't reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || pending;

  if (outcome !== "UNMARKED") {
    const label =
      outcome === "WON" ? "Marked won" : outcome === "LOST" ? "Marked lost" : "Marked void";

    return (
      <div className="mt-4 border-t border-navy-800 pt-4">
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              "text-sm font-medium",
              outcome === "WON"
                ? "text-positive"
                : outcome === "LOST"
                  ? "text-negative"
                  : "text-slate-400",
            )}
          >
            {label}
          </span>
          {editable ? (
            <button
              type="button"
              onClick={() => void mark("UNMARKED" as Outcome)}
              disabled={busy}
              className="min-h-11 text-sm text-slate-400 hover:text-slate-100 disabled:opacity-60"
            >
              Undo
            </button>
          ) : (
            <span className="text-xs text-slate-400">Final</span>
          )}
        </div>
        {error ? <p className="mt-2 text-xs text-negative">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-navy-800 pt-4">
      <div className="flex gap-2">
        <Button
          size="lg"
          variant="secondary"
          className="flex-1 hover:border-positive hover:text-positive"
          disabled={busy}
          onClick={() => void mark("WON" as Outcome)}
        >
          Won
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="flex-1 hover:border-negative hover:text-negative"
          disabled={busy}
          onClick={() => void mark("LOST" as Outcome)}
        >
          Lost
        </Button>
      </div>
      <button
        type="button"
        onClick={() => void mark("VOID" as Outcome)}
        disabled={busy}
        className="mt-2 min-h-11 w-full text-xs text-slate-400 hover:text-slate-100 disabled:opacity-60"
      >
        Bet was voided
      </button>
      {error ? <p className="mt-2 text-xs text-negative">{error}</p> : null}
    </div>
  );
}
