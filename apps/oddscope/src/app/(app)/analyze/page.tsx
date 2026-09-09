import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { hasAnalysisAccess } from "@/lib/plan";
import { checkAnalysisLimits } from "@/lib/rate-limit";
import { AnalyzeFlow } from "@/components/analyze/analyze-flow";
import { ButtonLink } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Analyze a match" };
export const dynamic = "force-dynamic";

export default async function AnalyzePage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!hasAnalysisAccess(user)) redirect("/upgrade");

  const limit = await checkAnalysisLimits(user.id, user.monthlyAnalysisLimit);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-100">Analyze a match</h1>
      <p className="prose-measure mt-1 text-sm leading-relaxed text-slate-400">
        Screenshot the odds board for a single match. Any bookmaker, any market.
      </p>

      <div className="mt-6">
        {limit.allowed ? (
          <AnalyzeFlow />
        ) : limit.reason === "monthly" ? (
          /* The user's own cap, reported without judgement and without an
             upsell — the whole point of setting it was to be held to it. */
          <div className="rounded-[12px] border border-navy-800 bg-navy-900 px-6 py-12 text-center">
            <h2 className="text-base font-semibold text-slate-100">
              You&apos;ve reached the limit you set
            </h2>
            <p className="prose-measure mx-auto mt-2 text-sm leading-relaxed text-slate-400">
              That&apos;s {limit.limit} analyses this month, which is the cap you chose for
              yourself. It resets on {formatDate(limit.resetsOn)}. Your history and settings
              stay open in the meantime.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <ButtonLink href="/history" variant="secondary" size="lg">
                Review your history
              </ButtonLink>
              <ButtonLink href="/settings" variant="ghost" size="lg">
                Change the limit
              </ButtonLink>
            </div>
          </div>
        ) : (
          <div className="rounded-[12px] border border-navy-800 bg-navy-900 px-6 py-12 text-center">
            <h2 className="text-base font-semibold text-slate-100">Give it a minute</h2>
            <p className="prose-measure mx-auto mt-2 text-sm leading-relaxed text-slate-400">
              You&apos;ve run ten analyses in the past hour. You can run another in about{" "}
              {limit.retryAfterMinutes} minute{limit.retryAfterMinutes === 1 ? "" : "s"}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
