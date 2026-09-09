import type { Metadata } from "next";
import { LegalShell } from "../legal-shell";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalShell title="Terms of use" updated="Last updated 9 September 2026">
      <section>
        <h2>What OddScope is</h2>
        <p>
          OddScope is a statistical analysis tool. It reads odds from a screenshot you
          provide, researches the fixture, and reports its own probability estimate
          alongside the bookmaker&apos;s implied probability. It does not place bets, hold
          funds, or act as a bookmaker or betting intermediary.
        </p>
      </section>

      <section>
        <h2>What it is not</h2>
        <p>
          Nothing OddScope returns is a prediction, a guarantee, or financial advice. Every
          figure is an estimate produced from publicly available information, and estimates
          are wrong some of the time. <strong>You are solely responsible for every bet you
          place and every rand you stake.</strong>
        </p>
      </section>

      <section>
        <h2>Eligibility</h2>
        <p>
          You must be at least 18 years old, and betting must be lawful where you are. It is
          your responsibility to know the law in your jurisdiction before using this service.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <p>
          Keep your login details to yourself. You are responsible for activity under your
          account. Do not share, resell or redistribute OddScope output as a tipping service.
        </p>
      </section>

      <section>
        <h2>Subscription and billing</h2>
        <p>
          New accounts get three days of full access. After that the subscription is R147 per
          month, billed by Whop. All payment processing, renewals and cancellations happen on
          Whop — we never see or store your card details. Cancel any time from your Whop
          dashboard; access continues to the end of the period you have paid for.
        </p>
      </section>

      <section>
        <h2>Availability</h2>
        <p>
          The service depends on third-party providers for analysis and for the data it
          researches. We do not guarantee uninterrupted availability, and an analysis may
          fail or return no result. When that happens we tell you rather than guessing.
        </p>
      </section>

      <section>
        <h2>Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, OddScope is not liable for betting losses,
          lost profits, or any indirect or consequential loss arising from your use of the
          service. Our total liability is limited to the amount you paid us in the twelve
          months before the claim.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update these terms. If we make a material change we will say so in the app
          before it takes effect.
        </p>
      </section>
    </LegalShell>
  );
}
