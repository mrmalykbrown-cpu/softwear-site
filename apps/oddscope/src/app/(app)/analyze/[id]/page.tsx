import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AnalysisStatus } from "@prisma/client";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isWithinEditWindow } from "@/lib/betting";
import { formatDateTime, formatPercent } from "@/lib/format";
import { TierCard } from "@/components/tier-card";
import { SettleControls } from "@/components/analyze/settle-controls";
import { ButtonLink } from "@/components/ui/button";
import { Crosshair } from "@/components/brand/crosshair";

export const metadata: Metadata = { title: "Analysis" };
export const dynamic = "force-dynamic";

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const analysis = await prisma.analysis.findUnique({
    where: { id },
    include: { recommendations: { orderBy: { tier: "asc" } } },
  });

  if (!analysis || analysis.userId !== user.id) notFound();

  if (analysis.status === AnalysisStatus.FAILED) {
    return (
      <div className="mx-auto w-full max-w-2xl rounded-[12px] border border-navy-800 bg-navy-900 px-6 py-12 text-center">
        <h1 className="text-base font-semibold text-slate-100">
          We couldn&apos;t read that screenshot
        </h1>
        <p className="prose-measure mx-auto mt-2 text-sm leading-relaxed text-slate-400">
          {analysis.failureReason ??
            "Something went wrong reading that image. Try a clearer screenshot."}
        </p>
        <ButtonLink href="/analyze" size="lg" className="mt-6">
          Try another screenshot
        </ButtonLink>
      </div>
    );
  }

  if (analysis.status === AnalysisStatus.PROCESSING) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center rounded-[12px] border border-navy-800 bg-navy-900 px-6 py-14 text-center">
        <Crosshair className="size-12 text-blue-400" spinning />
        <h1 className="mt-6 text-base font-semibold text-slate-100">Still working</h1>
        <p className="mt-2 text-sm text-slate-400">
          This analysis hasn&apos;t finished yet. Refresh in a moment.
        </p>
      </div>
    );
  }

  const kickoff = analysis.kickoff ? formatDateTime(analysis.kickoff) : null;
  const meta = [analysis.competition, kickoff, analysis.bookmaker].filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* Match header ------------------------------------------------- */}
      <header className="rounded-[12px] border border-navy-800 bg-navy-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">
              {analysis.homeTeam} v {analysis.awayTeam}
            </h1>
            {meta.length ? (
              <p className="tabular mt-1 text-sm text-slate-400">{meta.join(" · ")}</p>
            ) : null}
          </div>

          {analysis.bookmakerMargin != null ? (
            <p className="tabular text-sm text-slate-400">
              House margin on this market:{" "}
              <span className="font-medium text-slate-100">
                {formatPercent(analysis.bookmakerMargin)}
              </span>
            </p>
          ) : null}
        </div>

        {analysis.matchSummary ? (
          <p className="prose-measure mt-4 text-sm leading-relaxed text-slate-400">
            {analysis.matchSummary}
          </p>
        ) : null}

        {analysis.userNotes ? (
          <p className="mt-3 border-t border-navy-800 pt-3 text-sm text-slate-400">
            <span className="text-slate-100">Your note:</span> {analysis.userNotes}
          </p>
        ) : null}
      </header>

      {/* The three tiers ----------------------------------------------- */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {analysis.recommendations.map((rec, index) => (
          <TierCard
            key={rec.id}
            view={{
              id: rec.id,
              tier: rec.tier,
              noValue: rec.noValue,
              market: rec.market,
              selection: rec.selection,
              odds: rec.odds,
              modelProbability: rec.modelProbability,
              impliedProbability: rec.impliedProbability,
              edgePercent: rec.edgePercent,
              stakeUnits: rec.stakeUnits,
              stakeAmount: rec.stakeAmount,
              rationale: rec.rationale,
              outcome: rec.outcome,
            }}
            currency={user.currency}
            index={index}
            animate
          >
            {rec.noValue ? null : (
              <SettleControls
                recommendationId={rec.id}
                outcome={rec.outcome}
                editable={isWithinEditWindow(rec.settledAt)}
              />
            )}
          </TierCard>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <ButtonLink href="/analyze" size="lg" className="w-full sm:w-auto">
          Analyze another match
        </ButtonLink>
        <Link href="/history" className="min-h-12 py-3 text-sm text-blue-400 hover:text-blue-500">
          See your history
        </Link>
      </div>
    </div>
  );
}
