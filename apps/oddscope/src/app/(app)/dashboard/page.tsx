import Link from "next/link";
import type { Metadata } from "next";
import { AnalysisStatus, Plan } from "@prisma/client";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkoutUrlFor } from "@/lib/whop";
import { summarize } from "@/lib/stats";
import { formatDate, formatPercent, formatSignedPercent, formatUnits } from "@/lib/format";
import { StatTile, toneForValue } from "@/components/ui/stat-tile";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { OutcomeChip } from "@/components/ui/tier";
import { TrialBanner } from "@/components/trial-banner";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) return null;

  const [recommendations, analyses] = await Promise.all([
    prisma.recommendation.findMany({
      where: { noValue: false, analysis: { userId: user.id } },
      select: {
        tier: true,
        outcome: true,
        odds: true,
        stakeUnits: true,
        profitLoss: true,
        settledAt: true,
      },
    }),
    prisma.analysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        recommendations: {
          select: { tier: true, outcome: true, noValue: true },
          orderBy: { tier: "asc" },
        },
      },
    }),
  ]);

  const stats = summarize(recommendations);

  return (
    <>
      {user.plan === Plan.TRIAL ? (
        <TrialBanner trialEndsAt={user.trialEndsAt} checkoutUrl={checkoutUrlFor(user.id)} />
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">
            {/* No time-of-day greeting: this renders on the server, which has
                no idea what time it is where the reader is. */}
            Your numbers
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Every settled bet you have marked, and what it actually returned.
          </p>
        </div>
        <ButtonLink href="/analyze" size="lg" className="w-full sm:w-auto">
          Analyze a match
        </ButtonLink>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Bets settled" value={String(stats.betsSettled)} />
        <StatTile
          label="Strike rate"
          value={formatPercent(stats.strikeRate)}
          hint={stats.betsSettled ? `${stats.won}W · ${stats.lost}L` : undefined}
          tone={stats.strikeRate == null ? "muted" : "neutral"}
        />
        <StatTile
          label="ROI"
          value={formatSignedPercent(stats.roi)}
          hint="Profit per unit staked"
          tone={toneForValue(stats.roi)}
        />
        <StatTile
          label="Net units"
          value={formatUnits(stats.netUnits)}
          tone={toneForValue(stats.netUnits)}
        />
        <StatTile
          label="Current streak"
          value={
            stats.currentStreak
              ? `${stats.currentStreak.length}${stats.currentStreak.type}`
              : "—"
          }
          tone={
            stats.currentStreak
              ? stats.currentStreak.type === "W"
                ? "positive"
                : "negative"
              : "muted"
          }
        />
      </div>

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-100">Recent analyses</h2>
          {analyses.length ? (
            <Link href="/history" className="text-sm text-blue-400 hover:text-blue-500">
              Full history
            </Link>
          ) : null}
        </div>

        {analyses.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Nothing analyzed yet."
              body="Screenshot a match and let's look at the numbers."
            >
              <ButtonLink href="/analyze" size="lg">
                Analyze a match
              </ButtonLink>
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-navy-800 overflow-hidden rounded-[12px] border border-navy-800 bg-navy-900">
            {analyses.map((analysis) => {
              const failed = analysis.status === AnalysisStatus.FAILED;
              const processing = analysis.status === AnalysisStatus.PROCESSING;

              return (
                <li key={analysis.id}>
                  <Link
                    href={`/analyze/${analysis.id}`}
                    className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-navy-800/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">
                        {failed
                          ? "Screenshot could not be read"
                          : processing
                            ? "Analysis in progress"
                            : `${analysis.homeTeam} v ${analysis.awayTeam}`}
                      </p>
                      <p className="tabular mt-0.5 text-xs text-slate-400">
                        {formatDate(analysis.createdAt)}
                        {analysis.competition ? ` · ${analysis.competition}` : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-1.5">
                      {analysis.recommendations.map((rec) => (
                        <OutcomeChip
                          key={rec.tier}
                          tier={rec.tier}
                          outcome={rec.outcome}
                          noValue={rec.noValue}
                        />
                      ))}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
