import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TierCard } from "@/components/tier-card";
import { SAMPLE_MATCH, SAMPLE_PICKS } from "@/lib/sample-analysis";
import { formatPercent } from "@/lib/format";
import { HeroMockup } from "@/components/marketing/hero-mockup";
import { MarginExample } from "@/components/marketing/margin-example";
import { Faq } from "@/components/marketing/faq";

const HOW_IT_WORKS = [
  {
    title: "Screenshot the odds.",
    body: "Any bookmaker, any market, any layout. Betway, Hollywoodbets, Bet365, Supabets — if you can read it, so can we.",
  },
  {
    title: "We do the work you don't have time for.",
    body: "We pull the last six matches for both sides, confirmed injuries and suspensions, head-to-head history, and home/away splits. Then we build our own probability for every selection on your screen.",
  },
  {
    title: "You get three bets and one honest verdict.",
    body: "Safe, balanced, aggressive — each with its edge, its suggested stake, and the reasoning. And when the odds are simply bad, we say so instead of inventing a pick.",
  },
];

const WHY_IT_WORKS = [
  {
    title: "Three tiers, one screenshot.",
    body: "A cautious accumulator anchor and a genuine long shot are different bets for different moods. You get both, plus the middle, and you decide which one fits your night.",
  },
  {
    title: "Edge, in writing.",
    body: "Our probability against the bookmaker's implied probability, on every single pick. If we say 61% and they're pricing 54%, you can see the gap that justifies the stake.",
  },
  {
    title: "We tell you to skip.",
    body: "Most matches have no value in them. Tools that always find you a bet are selling you action, not analysis. When there's no edge, the card says so — and that's the pick.",
  },
  {
    title: "A history that doesn't flatter you.",
    body: "Mark every bet won or lost. Your real ROI, strike rate and per-tier performance, including the losing months. If the aggressive picks aren't paying for themselves, the numbers will tell you before your bankroll does.",
  },
];

const PLAN_FEATURES = [
  "Unlimited match analyses",
  "Live form, injury and head-to-head enrichment",
  "Three risk-tiered picks per match",
  "Fractional-Kelly stake sizing",
  "Full performance history and ROI tracking",
  "CSV export",
];

export default function LandingPage() {
  return (
    <main>
      {/* Hero ---------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-14 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h1 className="text-2xl font-semibold leading-tight text-slate-100 sm:text-3xl">
              Your bookmaker did the math. You didn&apos;t.
            </h1>
            <p className="prose-measure mt-6 text-base leading-relaxed text-slate-400">
              Every odd on that screen is a probability the bookmaker calculated, marked
              up, and is betting you won&apos;t check. OddScope checks it. Screenshot the
              match, get three bets ranked by risk, and see the exact edge on each one
              before a cent leaves your account.
            </p>

            <div className="mt-8">
              <ButtonLink href="/signup" size="lg" className="w-full sm:w-auto">
                Start your free trial
              </ButtonLink>
              <p className="tabular mt-3 text-sm text-slate-400">
                3 days free. Then R147/month. Cancel anytime.
              </p>
            </div>
          </div>

          <HeroMockup />
        </div>
      </section>

      {/* The margin ---------------------------------------------------- */}
      <section className="border-t border-navy-800">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <h2 className="text-xl font-semibold text-slate-100">
            Most bettors lose to a number they never look at
          </h2>

          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="prose-measure space-y-5 text-base leading-relaxed text-slate-400">
              <p>
                A bookmaker offers 1.90 on both sides of a coin flip. That looks fair. It
                isn&apos;t. Those two odds imply a 105.3% total probability — the extra
                5.3% is the house&apos;s margin, and it&apos;s the reason a 50/50 bettor
                goes broke slowly and predictably.
              </p>
              <p>
                At 1.90, you need to win 52.6% of your bets just to break even. Not 50%.
                That gap is the entire game, and OddScope is built to find the matches
                where the number is on your side.
              </p>
            </div>

            <MarginExample />
          </div>
        </div>
      </section>

      {/* How it works -------------------------------------------------- */}
      <section id="how-it-works" className="border-t border-navy-800 scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <h2 className="text-xl font-semibold text-slate-100">How it works</h2>

          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step.title}>
                <Card className="h-full p-5">
                  <span className="tabular text-sm font-medium text-blue-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-slate-100">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.body}</p>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why it works -------------------------------------------------- */}
      <section id="why-it-works" className="border-t border-navy-800 scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <h2 className="text-xl font-semibold text-slate-100">Why it works</h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {WHY_IT_WORKS.map((feature) => (
              <Card key={feature.title} className="p-5">
                <h3 className="text-base font-semibold text-slate-100">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sample analysis ------------------------------------------------ */}
      <section className="border-t border-navy-800">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <h2 className="text-xl font-semibold text-slate-100">Sample analysis</h2>
          <p className="prose-measure mt-3 text-base leading-relaxed text-slate-400">
            This is the whole product. An example of what one screenshot returns, including
            a tier we refused to fill.
          </p>

          <Card className="mt-8 overflow-hidden">
            <div className="border-b border-navy-800 px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">
                    {SAMPLE_MATCH.homeTeam} v {SAMPLE_MATCH.awayTeam}
                  </h3>
                  <p className="tabular mt-1 text-sm text-slate-400">
                    {SAMPLE_MATCH.competition} · {SAMPLE_MATCH.kickoff} ·{" "}
                    {SAMPLE_MATCH.bookmaker}
                  </p>
                </div>
                <p className="tabular text-sm text-slate-400">
                  House margin on this market:{" "}
                  <span className="text-slate-100">
                    {formatPercent(SAMPLE_MATCH.margin)}
                  </span>
                </p>
              </div>
              <p className="prose-measure mt-3 text-sm leading-relaxed text-slate-400">
                {SAMPLE_MATCH.summary}
              </p>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-3">
              {SAMPLE_PICKS.map((pick) => (
                <TierCard key={pick.tier} view={pick} currency="ZAR" />
              ))}
            </div>
          </Card>

          <p className="mt-4 text-xs text-slate-400">
            Example output from a past fixture, shown to illustrate the format. Not a live
            market.
          </p>
        </div>
      </section>

      {/* Pricing -------------------------------------------------------- */}
      <section id="pricing" className="border-t border-navy-800 scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <h2 className="text-xl font-semibold text-slate-100">Pricing</h2>

          <Card className="mt-8 max-w-md p-6">
            <div className="flex items-baseline gap-2">
              <span className="tabular text-2xl font-semibold text-slate-100">R147</span>
              <span className="text-base text-slate-400">/ month</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Three days free, first. No card charged until day four.
            </p>

            <ul className="mt-6 space-y-2.5">
              {PLAN_FEATURES.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm text-slate-100">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>

            <ButtonLink href="/signup" size="lg" className="mt-7 w-full">
              Start free trial
            </ButtonLink>
            <p className="mt-3 text-center text-xs text-slate-400">
              Cancel anytime from your Whop account.
            </p>
          </Card>
        </div>
      </section>

      {/* FAQ ------------------------------------------------------------ */}
      <section id="faq" className="border-t border-navy-800 scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <h2 className="text-xl font-semibold text-slate-100">Questions</h2>
          <Faq />

          <p className="mt-10 text-sm text-slate-400">
            Ready to check a match?{" "}
            <Link href="/signup" className="text-blue-400 hover:text-blue-500">
              Start your free trial
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
