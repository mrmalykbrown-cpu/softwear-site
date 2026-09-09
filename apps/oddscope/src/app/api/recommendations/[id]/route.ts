import { NextResponse } from "next/server";
import { AnalysisStatus, Outcome } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleRequestSchema } from "@/lib/schemas";
import { isWithinEditWindow, settlementProfit } from "@/lib/betting";

/**
 * Mark a recommendation won, lost or void — or undo that.
 *
 * An outcome stays editable for 24 hours and is then final. The window exists
 * because people mistype in the moment; the limit exists because a performance
 * history you can rewrite indefinitely is not a performance history.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const parsed = settleRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Unrecognised outcome." }, { status: 400 });
  }

  const recommendation = await prisma.recommendation.findUnique({
    where: { id },
    include: { analysis: { select: { id: true, userId: true } } },
  });

  if (!recommendation || recommendation.analysis.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (recommendation.noValue) {
    return NextResponse.json(
      { error: "There is no bet to settle on a tier we told you to skip." },
      { status: 400 },
    );
  }

  if (!isWithinEditWindow(recommendation.settledAt)) {
    return NextResponse.json(
      { error: "This result was marked more than 24 hours ago and is now final." },
      { status: 409 },
    );
  }

  const outcome = parsed.data.outcome as Outcome;
  const settled = outcome !== Outcome.UNMARKED;

  const profitLoss =
    settled && recommendation.stakeUnits != null && recommendation.odds != null
      ? Number(
          settlementProfit(
            outcome as "WON" | "LOST" | "VOID",
            recommendation.stakeUnits,
            recommendation.odds,
          ).toFixed(4),
        )
      : null;

  await prisma.recommendation.update({
    where: { id },
    data: {
      outcome,
      profitLoss,
      // Undoing clears the timestamp, which restarts the edit window if the
      // user marks it again. That is the intended behaviour: an undo inside
      // the window should not leave the row half-locked.
      settledAt: settled ? (recommendation.settledAt ?? new Date()) : null,
    },
  });

  await syncAnalysisStatus(recommendation.analysis.id);

  return NextResponse.json({ ok: true, outcome, profitLoss });
}

/**
 * An analysis is settled once every actionable recommendation has an outcome.
 * No-value tiers are not actionable and are never waited on.
 */
async function syncAnalysisStatus(analysisId: string) {
  const siblings = await prisma.recommendation.findMany({
    where: { analysisId },
    select: { noValue: true, outcome: true },
  });

  const actionable = siblings.filter((rec) => !rec.noValue);
  const allMarked =
    actionable.length > 0 && actionable.every((rec) => rec.outcome !== Outcome.UNMARKED);

  await prisma.analysis.update({
    where: { id: analysisId },
    data: {
      status:
        actionable.length === 0 || allMarked
          ? AnalysisStatus.SETTLED
          : AnalysisStatus.PENDING,
    },
  });
}
