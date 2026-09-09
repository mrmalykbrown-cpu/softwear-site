import type { RiskTier } from "@prisma/client";
import { cn } from "@/lib/utils";

/**
 * Tier identity in one place. Every appearance of SAFE / BALANCED / AGGRESSIVE
 * — badge, chip, table cell, chart legend — reads its colour and label here, so
 * a tier can never mean sky blue in one view and amber in another.
 */
export const TIER_META: Record<
  RiskTier,
  { label: string; text: string; border: string; bg: string; dot: string; blurb: string }
> = {
  SAFE: {
    label: "Safe",
    text: "text-tier-safe",
    border: "border-tier-safe/40",
    bg: "bg-tier-safe/10",
    dot: "bg-tier-safe",
    blurb: "High probability, short price. The accumulator anchor.",
  },
  BALANCED: {
    label: "Balanced",
    text: "text-tier-balanced",
    border: "border-tier-balanced/40",
    bg: "bg-tier-balanced/10",
    dot: "bg-tier-balanced",
    blurb: "The best edge in the middle of the board.",
  },
  AGGRESSIVE: {
    label: "Aggressive",
    text: "text-tier-aggressive",
    border: "border-tier-aggressive/40",
    bg: "bg-tier-aggressive/10",
    dot: "bg-tier-aggressive",
    blurb: "A long price the evidence says is mispriced.",
  },
};

export function TierBadge({ tier, className }: { tier: RiskTier; className?: string }) {
  const meta = TIER_META[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
        meta.text,
        meta.border,
        meta.bg,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/**
 * The small square chips beside a recent analysis: one per tier, coloured by
 * how that bet actually finished rather than by its tier.
 */
export function OutcomeChip({
  tier,
  outcome,
  noValue,
}: {
  tier: RiskTier;
  outcome: "UNMARKED" | "WON" | "LOST" | "VOID";
  noValue: boolean;
}) {
  const meta = TIER_META[tier];
  const title = noValue
    ? `${meta.label}: no value found`
    : `${meta.label}: ${outcome === "UNMARKED" ? "not yet marked" : outcome.toLowerCase()}`;

  const tone = noValue
    ? "bg-navy-800 text-muted"
    : outcome === "WON"
      ? "bg-positive/15 text-positive"
      : outcome === "LOST"
        ? "bg-negative/15 text-negative"
        : outcome === "VOID"
          ? "bg-navy-800 text-slate-400"
          : cn("bg-navy-800", meta.text);

  const glyph = noValue ? "–" : outcome === "WON" ? "W" : outcome === "LOST" ? "L" : outcome === "VOID" ? "V" : meta.label[0];

  return (
    <span
      title={title}
      className={cn(
        "tabular inline-flex size-6 items-center justify-center rounded text-xs font-medium",
        tone,
      )}
    >
      {glyph}
      <span className="sr-only">{title}</span>
    </span>
  );
}
