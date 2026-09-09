"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * The one-time risk acknowledgement.
 *
 * It has no close button and no backdrop dismissal — the only way past it is
 * the checkbox and the button, which is the point. A disclaimer that can be
 * clicked away without being read is decoration.
 */
export function RiskModal() {
  const [checked, setChecked] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);

  if (dismissed) return null;

  async function acknowledge() {
    setSaving(true);
    try {
      await fetch("/api/disclaimer", { method: "POST" });
      setDismissed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="risk-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/80 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="w-full max-w-lg rounded-[12px] border border-navy-800 bg-navy-900 p-6">
        <h2 id="risk-modal-title" className="text-lg font-semibold text-slate-100">
          Before you start
        </h2>

        <div className="prose-measure mt-4 space-y-3 text-sm leading-relaxed text-slate-400">
          <p>
            Everything OddScope returns is a probability estimate, not a prediction. The
            edge on a pick is our best reading of the evidence, and our reading can be
            wrong.
          </p>
          <p>
            Losing runs are statistically expected. Even a genuine long-term edge produces
            stretches of consecutive losses — that is what variance is, and it is not
            evidence that anything has broken.
          </p>
          <p className="text-slate-100">
            Stake only what you can afford to lose. If betting has stopped being something
            you choose to do, stop and talk to someone.
          </p>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-slate-100">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
            className="mt-0.5 size-5 shrink-0 rounded border-navy-800 bg-navy-950 accent-blue-500"
          />
          I understand these are estimates and that I can lose money.
        </label>

        <Button
          onClick={acknowledge}
          disabled={!checked || saving}
          size="lg"
          className="mt-5 w-full"
        >
          {saving ? "Saving…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
