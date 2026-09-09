import type { Outcome, RiskTier } from "@prisma/client";
import { cn } from "@/lib/utils";
import { formatCurrency, formatOdds, formatPercent, formatSignedPercent, formatStakeUnits } from "@/lib/format";
import { TIER_META, TierBadge } from "@/components/ui/tier";

export type TierCardView = {
  id?: string;
  tier: RiskTier;
  noValue: boolean;
  market: string | null;
  selection: string | null;
  odds: number | null;
  modelProbability: number | null;
  impliedProbability: number | null;
  edgePercent: number | null;
  stakeUnits: number | null;
  stakeAmount: number | null;
  rationale: string | null;
  outcome: Outcome;
};

/**
 * One tier's verdict.
 *
 * The no-value case is not an error state and is not styled like one — it is
 * muted rather than alarming, because "skip this" is a legitimate answer and
 * the card that says so is often the most valuable one on the screen.
 */
export function TierCard({
  view,
  currency = "ZAR",
  index = 0,
  animate = false,
  children,
}: {
  view: TierCardView;
  currency?: string;
  index?: number;
  animate?: boolean;
  children?: React.ReactNode;
}) {
  const meta = TIER_META[view.tier];
  // The one orchestrated motion moment: three cards over 400ms total.
  const style = animate ? { animationDelay: `${index * 120}ms` } : undefined;

  if (view.noValue) {
    return (
      <article
        style={style}
        className={cn(
          "rounded-[12px] border border-navy-800 bg-navy-900/60 p-5",
          animate && "tier-reveal",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-navy-800 bg-navy-800/60 px-2 py-1 text-xs font-medium text-muted">
            <span className="size-1.5 rounded-full bg-muted" aria-hidden="true" />
            {meta.label}
          </span>
          <span className="tabular text-xs text-muted">No value found</span>
        </div>

        <p className="prose-measure mt-4 text-sm leading-relaxed text-slate-400">
          No value at these odds. The best available price in this range is shorter than
          the true probability justifies. Skipping is the correct play here.
        </p>
      </article>
    );
  }

  const edge = view.edgePercent ?? 0;
  const positive = edge > 0;

  return (
    <article
      style={style}
      className={cn(
        "rounded-[12px] border border-navy-800 bg-navy-900 p-5",
        animate && "tier-reveal",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <TierBadge tier={view.tier} />
        <div className="text-right">
          <div className="text-xs text-slate-400">Odds</div>
          <div className="tabular text-xl font-semibold text-slate-100">
            {formatOdds(view.odds)}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs text-slate-400">{view.market ?? "Market"}</div>
        <h3 className="mt-0.5 text-lg font-semibold text-slate-100">
          {view.selection ?? "—"}
        </h3>
      </div>

      <ProbabilityComparison
        model={view.modelProbability}
        implied={view.impliedProbability}
      />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-navy-800 pt-4">
        <div>
          <div className="text-xs text-slate-400">Edge</div>
          <div
            className={cn(
              "tabular text-xl font-semibold",
              positive ? "text-positive" : "text-negative",
            )}
          >
            {formatSignedPercent(edge)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Suggested stake</div>
          <div className="tabular text-base font-medium text-slate-100">
            {formatStakeUnits(view.stakeUnits)} units
            {view.stakeAmount != null ? (
              <span className="text-slate-400">
                {" "}
                ({formatCurrency(view.stakeAmount, currency)})
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {view.rationale ? (
        <details className="group mt-4 border-t border-navy-800 pt-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium text-slate-100">
            Why this pick
            <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true">
              ▾
            </span>
          </summary>
          <p className="prose-measure mt-2 text-sm leading-relaxed text-slate-400">
            {view.rationale}
          </p>
        </details>
      ) : null}

      {children}
    </article>
  );
}

/**
 * Our probability against the bookmaker's implied probability, drawn to the
 * same scale so the gap between them is the visual, not a number to compare.
 */
export function ProbabilityComparison({
  model,
  implied,
}: {
  model: number | null;
  implied: number | null;
}) {
  const rows = [
    { label: "Our probability", value: model, bar: "bg-blue-400" },
    { label: "Bookmaker implies", value: implied, bar: "bg-slate-400/50" },
  ];

  return (
    <div className="mt-4 space-y-2.5">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-slate-400">{row.label}</span>
            <span className="tabular font-medium text-slate-100">
              {formatPercent(row.value, 0)}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-navy-800">
            <div
              className={cn("h-full rounded-full", row.bar)}
              style={{ width: `${Math.min(100, Math.max(0, (row.value ?? 0) * 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
