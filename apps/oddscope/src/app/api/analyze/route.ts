import { AnalysisStatus, RiskTier } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeRequestSchema, isExtractionError, isUsableMarket } from "@/lib/schemas";
import { analyzeMatch, extractOdds, PipelineError } from "@/lib/anthropic";
import { buildRecommendations, parseKickoff, resolveMargin } from "@/lib/pipeline";
import { checkAnalysisLimits } from "@/lib/rate-limit";
import { hasAnalysisAccess, accessDenialReason } from "@/lib/plan";
import { putScreenshot } from "@/lib/storage";

/**
 * The analysis pipeline endpoint.
 *
 * Progress is streamed as newline-delimited JSON rather than returned at the
 * end, because the work takes twenty to forty seconds and a spinner that lies
 * about what it is doing is worse than no spinner. Each event is emitted when
 * the corresponding stage actually starts — "researching" fires when the model
 * issues its first web search, not on a timer.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type StreamEvent =
  | { stage: "reading" }
  | { stage: "identifying"; homeTeam: string; awayTeam: string }
  | { stage: "researching" }
  | { stage: "calculating" }
  | { stage: "done"; analysisId: string }
  | { stage: "error"; message: string; retryable: boolean };

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return json({ error: "You need to be signed in to run an analysis." }, 401);
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return json({ error: "Account not found." }, 401);

  // The authoritative plan gate. Middleware makes the same decision from a JWT
  // snapshot for a faster redirect, but this is the one that counts.
  if (!hasAnalysisAccess(user)) {
    return json(
      { error: accessDenialReason(user) ?? "Your subscription is not active.", upgrade: true },
      402,
    );
  }

  const limit = await checkAnalysisLimits(user.id, user.monthlyAnalysisLimit);
  if (!limit.allowed) {
    return json(
      limit.reason === "hourly"
        ? {
            error: `You've run ten analyses in the past hour. You can run another in about ${limit.retryAfterMinutes} minute${limit.retryAfterMinutes === 1 ? "" : "s"}.`,
          }
        : {
            error: `You've reached the monthly limit of ${limit.limit} analyses you set for yourself. It resets on ${limit.resetsOn.toLocaleDateString("en-ZA", { day: "numeric", month: "long" })}.`,
            monthlyCap: true,
          },
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Malformed request." }, 400);
  }

  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "Invalid upload." }, 400);
  }

  const { image, notes } = parsed.data;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      // The row is created before any model call so that a screenshot we fail
      // to read still counts against the hourly limit and still appears in the
      // user's history. Team names are filled in once extraction succeeds.
      const analysis = await prisma.analysis.create({
        data: {
          userId: user.id,
          screenshotUrl: "",
          userNotes: notes?.trim() || null,
          homeTeam: "",
          awayTeam: "",
          rawExtraction: {},
          status: AnalysisStatus.PROCESSING,
        },
        select: { id: true },
      });

      const fail = async (message: string, retryable: boolean) => {
        await prisma.analysis.update({
          where: { id: analysis.id },
          data: { status: AnalysisStatus.FAILED, failureReason: message },
        });
        send({ stage: "error", message, retryable });
        controller.close();
      };

      try {
        send({ stage: "reading" });

        const extraction = await extractOdds(image);

        if (isExtractionError(extraction)) {
          await fail(
            "We couldn't read that screenshot. Make sure the odds are in focus and the whole market is visible, then try again.",
            true,
          );
          return;
        }

        const usableMarkets = extraction.markets.filter(isUsableMarket);
        if (usableMarkets.length === 0) {
          await fail(
            "We couldn't find any odds in that image. Screenshot the market itself — the list of selections and their prices.",
            true,
          );
          return;
        }

        const homeTeam = extraction.home_team ?? "Home";
        const awayTeam = extraction.away_team ?? "Away";

        // Storage happens after extraction: the image has already served its
        // purpose by this point, so a storage failure must not cost the user
        // an analysis.
        const screenshotUrl = await putScreenshot(image, user.id);

        await prisma.analysis.update({
          where: { id: analysis.id },
          data: {
            screenshotUrl,
            homeTeam,
            awayTeam,
            competition: extraction.competition,
            kickoff: parseKickoff(extraction.kickoff),
            bookmaker: extraction.bookmaker,
            rawExtraction: extraction as object,
          },
        });

        send({ stage: "identifying", homeTeam, awayTeam });

        const result = await analyzeMatch({
          extraction,
          notes,
          onProgress: (stage) => {
            if (stage === "researching") send({ stage: "researching" });
            if (stage === "calculating") send({ stage: "calculating" });
          },
        });

        const recommendations = buildRecommendations(
          extraction,
          result,
          user.stakeUnitSize,
        );

        // If every tier came back no-value there is nothing for the user to
        // mark, so the analysis is complete on arrival rather than waiting
        // forever for outcomes that will never exist.
        const anythingToBet = recommendations.some((rec) => !rec.noValue);

        await prisma.$transaction([
          prisma.analysis.update({
            where: { id: analysis.id },
            data: {
              matchSummary: result.match_summary,
              bookmakerMargin: resolveMargin(extraction, result),
              status: anythingToBet ? AnalysisStatus.PENDING : AnalysisStatus.SETTLED,
            },
          }),
          prisma.recommendation.createMany({
            data: recommendations.map((rec) => ({
              analysisId: analysis.id,
              tier: rec.tier as RiskTier,
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
            })),
          }),
        ]);

        send({ stage: "done", analysisId: analysis.id });
        controller.close();
      } catch (error) {
        const message =
          error instanceof PipelineError
            ? error.message
            : "Something went wrong during analysis. Your analysis wasn't charged against your limit twice — try again.";
        const retryable = error instanceof PipelineError ? error.retryable : true;

        if (!(error instanceof PipelineError)) {
          console.error("[analyze] unexpected failure", error);
        }

        try {
          await fail(message, retryable);
        } catch {
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // Stops nginx-style proxies from buffering the progress events.
      "X-Accel-Buffering": "no",
    },
  });
}
