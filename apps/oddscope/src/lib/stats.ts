import { Outcome, RiskTier } from "@prisma/client";

/**
 * Performance aggregation.
 *
 * Pure functions over rows so the dashboard, the history summary bar and the
 * per-tier table all compute the same way — the filtered view and the lifetime
 * view must never be able to disagree about what ROI means.
 *
 * Two conventions, both standard and both deliberate:
 *   - Void bets are settled but excluded from strike rate and ROI. A refund is
 *     not a result.
 *   - ROI is profit over turnover, not over bankroll. It answers "what did each
 *     unit staked return", which is the number that survives a change in stake
 *     sizing.
 */

export type SettledRow = {
  tier: RiskTier;
  outcome: Outcome;
  odds: number | null;
  stakeUnits: number | null;
  profitLoss: number | null;
  settledAt: Date | null;
};

export type PerformanceSummary = {
  betsSettled: number;
  won: number;
  lost: number;
  voided: number;
  pending: number;
  strikeRate: number | null;
  roi: number | null;
  netUnits: number;
  unitsStaked: number;
  averageOdds: number | null;
  currentStreak: { type: "W" | "L"; length: number } | null;
};

const isDecided = (row: SettledRow) =>
  row.outcome === Outcome.WON || row.outcome === Outcome.LOST;

export function summarize(rows: SettledRow[]): PerformanceSummary {
  const decided = rows.filter(isDecided);
  const won = decided.filter((r) => r.outcome === Outcome.WON).length;
  const lost = decided.length - won;
  const voided = rows.filter((r) => r.outcome === Outcome.VOID).length;
  const pending = rows.filter((r) => r.outcome === Outcome.UNMARKED).length;

  const unitsStaked = decided.reduce((sum, r) => sum + (r.stakeUnits ?? 0), 0);
  const netUnits = rows.reduce((sum, r) => sum + (r.profitLoss ?? 0), 0);

  const oddsRows = decided.filter((r) => r.odds != null);
  const averageOdds = oddsRows.length
    ? oddsRows.reduce((sum, r) => sum + (r.odds ?? 0), 0) / oddsRows.length
    : null;

  return {
    betsSettled: decided.length + voided,
    won,
    lost,
    voided,
    pending,
    strikeRate: decided.length ? won / decided.length : null,
    roi: unitsStaked > 0 ? netUnits / unitsStaked : null,
    netUnits,
    unitsStaked,
    averageOdds,
    currentStreak: currentStreak(rows),
  };
}

/** Consecutive wins or losses ending at the most recently settled bet. */
export function currentStreak(rows: SettledRow[]): { type: "W" | "L"; length: number } | null {
  const decided = rows
    .filter((row) => isDecided(row) && row.settledAt)
    .sort((a, b) => (b.settledAt?.getTime() ?? 0) - (a.settledAt?.getTime() ?? 0));

  if (!decided.length) return null;

  const type = decided[0].outcome === Outcome.WON ? "W" : "L";
  let length = 0;
  for (const row of decided) {
    const rowType = row.outcome === Outcome.WON ? "W" : "L";
    if (rowType !== type) break;
    length += 1;
  }
  return { type, length };
}

export type TierBreakdown = PerformanceSummary & { tier: RiskTier };

export const ALL_TIERS: RiskTier[] = [RiskTier.SAFE, RiskTier.BALANCED, RiskTier.AGGRESSIVE];

/**
 * Per-tier performance. Every tier is returned even with no settled bets in it,
 * because an empty aggressive row is itself information about how the account
 * is being used.
 */
export function breakdownByTier(rows: SettledRow[]): TierBreakdown[] {
  return ALL_TIERS.map((tier) => ({
    tier,
    ...summarize(rows.filter((row) => row.tier === tier)),
  }));
}

export type CumulativePoint = { date: string; units: number; label: string };

/**
 * Running profit in units over time, for the history chart. Starts at zero so
 * the line has an origin to rise or fall from.
 */
export function cumulativeUnits(rows: SettledRow[]): CumulativePoint[] {
  const settled = rows
    .filter((row) => row.settledAt && row.outcome !== Outcome.UNMARKED)
    .sort((a, b) => (a.settledAt?.getTime() ?? 0) - (b.settledAt?.getTime() ?? 0));

  if (!settled.length) return [];

  const points: CumulativePoint[] = [{ date: "", units: 0, label: "Start" }];
  let running = 0;

  for (const row of settled) {
    running += row.profitLoss ?? 0;
    const date = row.settledAt as Date;
    points.push({
      date: date.toISOString(),
      units: Number(running.toFixed(2)),
      label: date.toLocaleDateString("en-ZA", { day: "2-digit", month: "short" }),
    });
  }

  return points;
}
