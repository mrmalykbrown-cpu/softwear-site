import { cn } from "@/lib/utils";

/**
 * A single reading. The value is always mono and tabular; the label is always
 * sentence case and quiet. Tone colours the value only when the sign of the
 * number is itself the message.
 */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative" | "muted";
  className?: string;
}) {
  const toneClass =
    tone === "positive"
      ? "text-positive"
      : tone === "negative"
        ? "text-negative"
        : tone === "muted"
          ? "text-muted"
          : "text-slate-100";

  return (
    <div
      className={cn(
        "rounded-[12px] border border-navy-800 bg-navy-900 px-4 py-3.5",
        className,
      )}
    >
      <div className="text-xs text-slate-400">{label}</div>
      <div className={cn("tabular mt-1.5 text-xl font-semibold", toneClass)}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
    </div>
  );
}

/** Picks a tone from a signed number so callers do not repeat the ternary. */
export function toneForValue(value: number | null | undefined): "positive" | "negative" | "muted" {
  if (value == null || !Number.isFinite(value) || value === 0) return "muted";
  return value > 0 ? "positive" : "negative";
}
