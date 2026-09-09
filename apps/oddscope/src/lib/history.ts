import "server-only";
import { Outcome, RiskTier } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * The history query, shared by the page and the CSV export so that what a user
 * exports is exactly what they were looking at when they pressed the button.
 */

export type HistoryFilters = {
  tier: RiskTier | null;
  outcome: Outcome | null;
  from: Date | null;
  to: Date | null;
};

const TIERS = Object.values(RiskTier) as string[];
const OUTCOMES = Object.values(Outcome) as string[];

function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseFilters(params: Record<string, string | undefined>): HistoryFilters {
  const tier = params.tier && TIERS.includes(params.tier) ? (params.tier as RiskTier) : null;
  const outcome =
    params.outcome && OUTCOMES.includes(params.outcome) ? (params.outcome as Outcome) : null;

  const from = parseDate(params.from);
  const to = parseDate(params.to);
  // An end date is inclusive of the whole day the user picked.
  if (to) to.setHours(23, 59, 59, 999);

  return { tier, outcome, from, to };
}

export type HistoryRow = Awaited<ReturnType<typeof fetchHistory>>[number];

/**
 * Every settled-or-pending bet for a user, newest first.
 *
 * No-value tiers are excluded: they are advice not to bet, so they have no
 * odds, no stake and no result, and a row of dashes in a performance table is
 * noise rather than information. They remain visible on the analysis itself.
 */
export async function fetchHistory(userId: string, filters: HistoryFilters) {
  return prisma.recommendation.findMany({
    where: {
      noValue: false,
      ...(filters.tier ? { tier: filters.tier } : {}),
      ...(filters.outcome ? { outcome: filters.outcome } : {}),
      analysis: {
        userId,
        ...(filters.from || filters.to
          ? {
              createdAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
    },
    include: {
      analysis: {
        select: {
          id: true,
          homeTeam: true,
          awayTeam: true,
          competition: true,
          createdAt: true,
        },
      },
    },
    orderBy: { analysis: { createdAt: "desc" } },
    take: 1000,
  });
}

/** Build a query string that round-trips the active filters. */
export function filtersToQuery(filters: HistoryFilters): string {
  const params = new URLSearchParams();
  if (filters.tier) params.set("tier", filters.tier);
  if (filters.outcome) params.set("outcome", filters.outcome);
  if (filters.from) params.set("from", filters.from.toISOString().slice(0, 10));
  if (filters.to) params.set("to", filters.to.toISOString().slice(0, 10));
  const query = params.toString();
  return query ? `?${query}` : "";
}
