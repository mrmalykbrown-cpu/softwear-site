import "server-only";
import { prisma } from "./prisma";

/**
 * Usage limits.
 *
 * Both counters are derived from the Analysis table rather than held in memory,
 * so they survive a redeploy and stay correct across serverless instances. The
 * hourly cap protects the API budget; the monthly cap is the user's own limit
 * on themselves and is treated with more care in the copy that reports it.
 */

export const ANALYSES_PER_HOUR = 10;

export type LimitVerdict =
  | { allowed: true }
  | { allowed: false; reason: "hourly"; retryAfterMinutes: number }
  | { allowed: false; reason: "monthly"; limit: number; resetsOn: Date };

export function startOfNextMonth(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export function startOfMonth(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function checkAnalysisLimits(
  userId: string,
  monthlyAnalysisLimit: number | null,
  now: Date = new Date(),
): Promise<LimitVerdict> {
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [recentCount, monthCount] = await Promise.all([
    prisma.analysis.count({ where: { userId, createdAt: { gte: hourAgo } } }),
    monthlyAnalysisLimit
      ? prisma.analysis.count({ where: { userId, createdAt: { gte: startOfMonth(now) } } })
      : Promise.resolve(0),
  ]);

  if (recentCount >= ANALYSES_PER_HOUR) {
    const oldest = await prisma.analysis.findFirst({
      where: { userId, createdAt: { gte: hourAgo } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const freesAt = oldest
      ? new Date(oldest.createdAt.getTime() + 60 * 60 * 1000)
      : new Date(now.getTime() + 60 * 60 * 1000);
    return {
      allowed: false,
      reason: "hourly",
      retryAfterMinutes: Math.max(1, Math.ceil((freesAt.getTime() - now.getTime()) / 60_000)),
    };
  }

  if (monthlyAnalysisLimit && monthCount >= monthlyAnalysisLimit) {
    return {
      allowed: false,
      reason: "monthly",
      limit: monthlyAnalysisLimit,
      resetsOn: startOfNextMonth(now),
    };
  }

  return { allowed: true };
}

/** How many analyses this user has run in the current calendar month. */
export function monthlyUsage(userId: string, now: Date = new Date()): Promise<number> {
  return prisma.analysis.count({ where: { userId, createdAt: { gte: startOfMonth(now) } } });
}
