import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { checkoutUrlFor } from "@/lib/whop";
import { accessDenialReason, hasAnalysisAccess } from "@/lib/plan";
import { AppNav } from "@/components/app-nav";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Subscribe" };
export const dynamic = "force-dynamic";

const FEATURES = [
  "Unlimited match analyses",
  "Live form, injury and head-to-head enrichment",
  "Three risk-tiered picks per match",
  "Fractional-Kelly stake sizing",
  "Full performance history and ROI tracking",
  "CSV export",
];

export default async function UpgradePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  // Self-healing: middleware makes its decision from a token snapshot that can
  // lag a webhook by up to a minute. If the User row says the plan is live,
  // send them straight back rather than showing a paywall they already cleared.
  if (hasAnalysisAccess(user)) redirect("/analyze");

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-2xl px-5 py-10">
        <h1 className="text-xl font-semibold text-slate-100">
          {accessDenialReason(user) ?? "Your subscription is not active."}
        </h1>
        <p className="prose-measure mt-2 text-sm leading-relaxed text-slate-400">
          New analyses are paused until you subscribe. Your history, your settings and
          every analysis you have already run stay exactly where they are — you can read
          and export all of it right now.
        </p>

        <Card className="mt-8 p-6">
          <div className="flex items-baseline gap-2">
            <span className="tabular text-2xl font-semibold text-slate-100">R147</span>
            <span className="text-base text-slate-400">/ month</span>
          </div>

          <ul className="mt-6 space-y-2.5">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex gap-3 text-sm text-slate-100">
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-500"
                  aria-hidden="true"
                />
                {feature}
              </li>
            ))}
          </ul>

          <ButtonLink href={checkoutUrlFor(user.id)} external size="lg" className="mt-7 w-full">
            Subscribe on Whop
          </ButtonLink>
          <p className="mt-3 text-center text-xs text-slate-400">
            Checkout, billing and cancellation are handled by Whop. Cancel anytime.
          </p>
        </Card>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/history" className="text-blue-400 hover:text-blue-500">
            Read your history
          </Link>
          <Link href="/settings" className="text-blue-400 hover:text-blue-500">
            Account settings
          </Link>
        </div>
      </main>
    </>
  );
}
