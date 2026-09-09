import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "../legal-shell";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <LegalShell title="Contact">
      <section>
        <h2>Support</h2>
        <p>
          Email <a href="mailto:support@oddscope.app">support@oddscope.app</a>. Include the
          date and the match name if you are writing about a specific analysis — that is
          enough for us to find it.
        </p>
      </section>

      <section>
        <h2>Billing</h2>
        <p>
          Subscriptions, invoices and cancellations are handled by Whop. Cancel from your{" "}
          <a href="https://whop.com/orders" target="_blank" rel="noopener noreferrer">
            Whop dashboard
          </a>{" "}
          — no email required, and no retention call.
        </p>
      </section>

      <section>
        <h2>Data requests</h2>
        <p>
          To request a copy of your data or delete your account, email the support address
          above. You can export your betting history yourself, any time, from the history
          page. Our <Link href="/privacy">privacy policy</Link> sets out what we hold.
        </p>
      </section>

      <section>
        <h2>Something wrong with an analysis?</h2>
        <p>
          Tell us. If we misread a price off a screenshot, that is a bug and we want to see
          it. If you disagree with a probability estimate, that is a judgement call and we
          are still interested — the reasoning is written out on every pick precisely so it
          can be argued with.
        </p>
      </section>
    </LegalShell>
  );
}
