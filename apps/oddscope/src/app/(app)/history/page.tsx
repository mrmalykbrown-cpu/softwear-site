import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { fetchHistory, filtersToQuery, parseFilters } from "@/lib/history";
import { breakdownByTier, cumulativeUnits, summarize } from "@/lib/stats";
import {
  formatDate,
  formatOdds,
  formatPercent,
  formatSignedPercent,
  formatUnits,
} from "@/lib/format";
import { StatTile, toneForValue } from "@/components/ui/stat-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { TIER_META, TierBadge } from "@/components/ui/tier";
import { UnitsChart } from "@/components/history/units-chart";
import { HistoryFilters } from "@/components/history/filters";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "History" };
export const dynamic = "force-dynamic";

const OUTCOME_STYLES: Record<string, string> = {
  WON: "text-positive",
  LOST: "text-negative",
  VOID: "text-slate-400",
  UNMARKED: "text-muted",
};

const OUTCOME_LABELS: Record<string, string> = {
  WON: "Won",
  LOST: "Lost",
  VOID: "Void",
  UNMARKED: "Open",
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );

  const filters = parseFilters(flat);
  const rows = await fetchHistory(user.id, filters);

  // Every aggregate on this page is computed from the filtered rows, so the
  // summary bar always describes exactly what is in the table below it.
  const stats = summarize(rows);
  const tiers = breakdownByTier(rows);
  const curve = cumulativeUnits(rows);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">History</h1>
          <p className="mt-1 text-sm text-slate-400">
            Every bet you have marked, and what it actually returned.
          </p>
        </div>
        <ButtonLink
          href={`/api/history/export${filtersToQuery(filters)}`}
          variant="secondary"
          size="md"
        >
          <Download className="size-4" />
          Export CSV
        </ButtonLink>
      </div>

      <div className="mt-6">
        <Suspense fallback={<div className="h-11" />}>
          <HistoryFilters />
        </Suspense>
      </div>

      {/* Summary, recalculated for the active filter --------------------- */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Bets settled" value={String(stats.betsSettled)} />
        <StatTile
          label="Strike rate"
          value={formatPercent(stats.strikeRate)}
          hint={stats.betsSettled ? `${stats.won}W · ${stats.lost}L` : undefined}
        />
        <StatTile
          label="ROI"
          value={formatSignedPercent(stats.roi)}
          tone={toneForValue(stats.roi)}
        />
        <StatTile
          label="Net units"
          value={formatUnits(stats.netUnits)}
          tone={toneForValue(stats.netUnits)}
        />
        <StatTile
          label="Open bets"
          value={String(stats.pending)}
          tone={stats.pending ? "neutral" : "muted"}
        />
      </div>

      {/* Curve ----------------------------------------------------------- */}
      <section className="mt-6 rounded-[12px] border border-navy-800 bg-navy-900 p-5">
        <h2 className="text-sm font-medium text-slate-400">Cumulative units</h2>
        <div className="mt-4">
          <UnitsChart data={curve} />
        </div>
      </section>

      {/* Per-tier -------------------------------------------------------- */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-slate-100">By tier</h2>
        <p className="mt-1 text-sm text-slate-400">
          Whether each risk level is paying for itself, for you specifically.
        </p>

        <div className="mt-4 overflow-x-auto rounded-[12px] border border-navy-800 bg-navy-900">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-navy-800 text-left text-xs text-slate-400">
                <th scope="col" className="px-4 py-3 font-medium">Tier</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Settled</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Strike rate</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Avg odds</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Net units</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800">
              {tiers.map((tier) => (
                <tr key={tier.tier}>
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <span className={cn("font-medium", TIER_META[tier.tier].text)}>
                      {TIER_META[tier.tier].label}
                    </span>
                  </th>
                  <td className="tabular px-4 py-3 text-right text-slate-100">
                    {tier.betsSettled}
                  </td>
                  <td className="tabular px-4 py-3 text-right text-slate-100">
                    {formatPercent(tier.strikeRate)}
                  </td>
                  <td className="tabular px-4 py-3 text-right text-slate-400">
                    {formatOdds(tier.averageOdds)}
                  </td>
                  <td
                    className={cn(
                      "tabular px-4 py-3 text-right",
                      tier.netUnits > 0
                        ? "text-positive"
                        : tier.netUnits < 0
                          ? "text-negative"
                          : "text-slate-400",
                    )}
                  >
                    {formatUnits(tier.netUnits)}
                  </td>
                  <td
                    className={cn(
                      "tabular px-4 py-3 text-right",
                      (tier.roi ?? 0) > 0
                        ? "text-positive"
                        : (tier.roi ?? 0) < 0
                          ? "text-negative"
                          : "text-slate-400",
                    )}
                  >
                    {formatSignedPercent(tier.roi)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* The table ------------------------------------------------------- */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-100">Every bet</h2>

        {rows.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Nothing here yet."
              body="Analyses with a bet in them show up here once you have run one. If you have filters set, try clearing them."
            >
              <ButtonLink href="/analyze" size="lg">
                Analyze a match
              </ButtonLink>
            </EmptyState>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-[12px] border border-navy-800 bg-navy-900">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-navy-800 text-left text-xs text-slate-400">
                  <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium">Match</th>
                  <th scope="col" className="px-4 py-3 font-medium">Market</th>
                  <th scope="col" className="px-4 py-3 font-medium">Selection</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Odds</th>
                  <th scope="col" className="px-4 py-3 font-medium">Tier</th>
                  <th scope="col" className="px-4 py-3 font-medium">Outcome</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">P/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-navy-800/30">
                    <td className="tabular whitespace-nowrap px-4 py-3 text-slate-400">
                      {formatDate(row.analysis.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/analyze/${row.analysis.id}`}
                        className="text-slate-100 hover:text-blue-400"
                      >
                        {row.analysis.homeTeam} v {row.analysis.awayTeam}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{row.market ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-100">{row.selection ?? "—"}</td>
                    <td className="tabular px-4 py-3 text-right text-slate-100">
                      {formatOdds(row.odds)}
                    </td>
                    <td className="px-4 py-3">
                      <TierBadge tier={row.tier} />
                    </td>
                    <td className={cn("px-4 py-3", OUTCOME_STYLES[row.outcome])}>
                      {OUTCOME_LABELS[row.outcome]}
                    </td>
                    <td
                      className={cn(
                        "tabular px-4 py-3 text-right",
                        (row.profitLoss ?? 0) > 0
                          ? "text-positive"
                          : (row.profitLoss ?? 0) < 0
                            ? "text-negative"
                            : "text-slate-400",
                      )}
                    >
                      {row.outcome === "UNMARKED" ? "—" : formatUnits(row.profitLoss)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
