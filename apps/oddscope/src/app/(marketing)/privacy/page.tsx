import type { Metadata } from "next";
import { LegalShell } from "../legal-shell";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy policy" updated="Last updated 9 September 2026">
      <section>
        <h2>What we collect</h2>
        <p>
          Your email address and name; a hashed password if you signed up with one; the
          screenshots you upload and any notes you add to them; the analyses we produce and
          the outcomes you mark; and your staking preferences. If you sign in with Google we
          receive your email address, name and profile picture from Google.
        </p>
      </section>

      <section>
        <h2>What we do with it</h2>
        <p>
          We use it to run the analyses you ask for, to build your performance history, and
          to keep your subscription in sync with Whop. We do not sell your data, and we do
          not use your betting history for advertising.
        </p>
      </section>

      <section>
        <h2>Who else sees it</h2>
        <p>
          Your screenshot and the odds read from it are sent to Anthropic&apos;s API to
          perform the analysis. Subscription events come to us from Whop. Our database is
          hosted by our infrastructure providers. That is the complete list of third parties
          that touch your data.
        </p>
      </section>

      <section>
        <h2>Passwords</h2>
        <p>
          Passwords are hashed with bcrypt before storage. We cannot read your password and
          cannot recover it for you.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          Analyses and their results are kept for as long as your account exists, because
          they are your performance history. Delete your account and everything attached to
          it — analyses, recommendations and screenshots — is deleted with it.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You can export your history as CSV at any time from the history page. To request a
          copy of everything we hold, or deletion of your account, email us at the address on
          the contact page.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          We set one session cookie so you stay logged in. There are no advertising or
          third-party tracking cookies.
        </p>
      </section>
    </LegalShell>
  );
}
