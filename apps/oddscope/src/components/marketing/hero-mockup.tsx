import { formatOdds, formatPercent, formatSignedPercent } from "@/lib/format";
import { SAMPLE_MATCH, SAMPLE_PICKS } from "@/lib/sample-analysis";
import { TIER_META } from "@/components/ui/tier";
import { cn } from "@/lib/utils";

/**
 * A condensed results screen for the hero.
 *
 * It reads from the same sample data as the full example further down the page,
 * so the two can never drift apart — and it keeps the no-value tier, because
 * the tier we refuse to fill is the most honest thing on the page.
 */
export function HeroMockup() {
  return (
    <div className="rounded-[12px] border border-navy-800 bg-navy-900">
      <div className="flex items-baseline justify-between gap-3 border-b border-navy-800 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-100">
            {SAMPLE_MATCH.homeTeam} v {SAMPLE_MATCH.awayTeam}
          </div>
          <div className="tabular mt-0.5 text-xs text-slate-400">
            {SAMPLE_MATCH.competition} · {SAMPLE_MATCH.bookmaker}
          </div>
        </div>
        <div className="tabular text-right text-xs text-slate-400">
          <div>House margin</div>
          <div className="text-slate-100">{formatPercent(SAMPLE_MATCH.margin)}</div>
        </div>
      </div>

      <div className="divide-y divide-navy-800">
        {SAMPLE_PICKS.map((pick) => {
          const meta = TIER_META[pick.tier];

          if (pick.noValue) {
            return (
              <div key={pick.tier} className="px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted">{meta.label}</span>
                  <span className="tabular text-xs text-muted">No value found</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  Nothing above 3.00 is priced longer than the evidence justifies.
                </p>
              </div>
            );
          }

          return (
            <div key={pick.tier} className="px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className={cn("text-xs font-medium", meta.text)}>{meta.label}</span>
                <span className="tabular text-xs text-slate-400">{pick.market}</span>
              </div>

              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-slate-100">{pick.selection}</span>
                <span className="tabular text-sm font-semibold text-slate-100">
                  {formatOdds(pick.odds)}
                </span>
              </div>

              <div className="tabular mt-2 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-400">
                  Ours {formatPercent(pick.modelProbability, 0)} · Theirs{" "}
                  {formatPercent(pick.impliedProbability, 0)}
                </span>
                <span className="font-semibold text-positive">
                  {formatSignedPercent(pick.edgePercent)}
                </span>
              </div>

              <div className="mt-2 flex h-1 gap-0.5 overflow-hidden rounded-full bg-navy-800">
                <div
                  className="h-full rounded-l-full bg-blue-400"
                  style={{ width: `${(pick.modelProbability ?? 0) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
