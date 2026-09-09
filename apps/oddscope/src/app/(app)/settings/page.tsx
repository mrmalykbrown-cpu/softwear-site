import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Plan } from "@prisma/client";
import { currentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { checkoutUrlFor } from "@/lib/whop";
import { monthlyUsage } from "@/lib/rate-limit";
import { formatDate } from "@/lib/format";
import { Card, CardBody, CardHeader, SectionTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import {
  PasswordForm,
  ProfileForm,
  ResponsibleUseForm,
  StakingForm,
} from "@/components/settings/settings-forms";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const SUPPORT_RESOURCES = [
  {
    name: "South African Responsible Gambling Foundation",
    detail: "Free counselling. 0800 006 008, or WhatsApp 076 675 0710.",
    href: "https://www.responsiblegambling.org.za/",
  },
  {
    name: "GamCare (UK)",
    detail: "24-hour helpline and live chat. 0808 8020 133.",
    href: "https://www.gamcare.org.uk/",
  },
  {
    name: "Gamblers Anonymous",
    detail: "Peer support groups worldwide.",
    href: "https://www.gamblersanonymous.org/",
  },
];

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const usedThisMonth = await monthlyUsage(user.id);

  const planLabel =
    user.plan === Plan.ACTIVE
      ? "Active"
      : user.plan === Plan.TRIAL
        ? "Free trial"
        : "Expired";

  const renewalDate =
    user.plan === Plan.TRIAL ? user.trialEndsAt : user.subscriptionEndsAt;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-100">Settings</h1>

      <div className="mt-6 space-y-6">
        <ProfileForm name={user.name ?? ""} email={user.email} />

        <PasswordForm hasPassword={Boolean(user.passwordHash)} />

        <StakingForm
          bankroll={user.bankroll}
          stakeUnitSize={user.stakeUnitSize}
          currency={user.currency}
        />

        {/* Subscription ------------------------------------------------- */}
        <Card>
          <CardHeader>
            <SectionTitle>Subscription</SectionTitle>
          </CardHeader>
          <CardBody>
            <dl className="space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-slate-400">Current plan</dt>
                <dd className="font-medium text-slate-100">{planLabel}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-slate-400">
                  {user.plan === Plan.TRIAL ? "Trial ends" : "Renews"}
                </dt>
                <dd className="tabular text-slate-100">
                  {renewalDate ? formatDate(renewalDate) : "—"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-slate-400">Price</dt>
                <dd className="tabular text-slate-100">R147 / month</dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <ButtonLink href={env.whopPortalUrl} external variant="secondary" size="lg">
                Manage subscription
              </ButtonLink>
              {user.plan !== Plan.ACTIVE ? (
                <ButtonLink href={checkoutUrlFor(user.id)} external size="lg">
                  Subscribe on Whop
                </ButtonLink>
              ) : null}
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Billing, card details and cancellation are handled entirely by Whop. OddScope
              never sees your payment information.
            </p>
          </CardBody>
        </Card>

        <ResponsibleUseForm
          monthlyAnalysisLimit={user.monthlyAnalysisLimit}
          usedThisMonth={usedThisMonth}
        />

        {/* Support ------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <SectionTitle>If betting has stopped being a choice</SectionTitle>
          </CardHeader>
          <CardBody>
            <p className="prose-measure text-sm leading-relaxed text-slate-400">
              These services are free, confidential, and not connected to us in any way.
            </p>
            <ul className="mt-4 space-y-4">
              {SUPPORT_RESOURCES.map((resource) => (
                <li key={resource.name}>
                  <a
                    href={resource.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-400 hover:text-blue-500"
                  >
                    {resource.name}
                  </a>
                  <p className="tabular mt-0.5 text-sm text-slate-400">{resource.detail}</p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
