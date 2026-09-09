import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "../legal-shell";

export const metadata: Metadata = { title: "Responsible gambling" };

const RESOURCES = [
  {
    name: "South African Responsible Gambling Foundation",
    detail: "Free, confidential counselling. 0800 006 008, or WhatsApp 076 675 0710.",
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
  {
    name: "Gambling Therapy",
    detail: "Free online support in multiple languages.",
    href: "https://www.gamblingtherapy.org/",
  },
];

export default function ResponsibleGamblingPage() {
  return (
    <LegalShell title="Responsible gambling">
      <section>
        <p>
          OddScope is built to make betting more deliberate. That only works if the
          deliberation includes whether to bet at all.
        </p>
      </section>

      <section>
        <h2>What the numbers actually mean</h2>
        <p>
          A positive edge is not a win. It means that if the same bet were available a
          thousand times, you would expect to come out ahead across all thousand. You are
          not getting a thousand. You are getting one, and one bet with a 6% edge still
          loses about as often as the odds say it will.
        </p>
        <p>
          Losing runs are mathematically normal. A bettor with a genuine long-term edge will
          still have losing weeks, losing months, and stretches of eight or ten losses in a
          row. That is variance doing what variance does — not a broken system, and not a
          reason to raise your stakes to catch up.
        </p>
      </section>

      <section>
        <h2>Signs worth taking seriously</h2>
        <p>
          Betting more than you planned. Chasing losses with bigger stakes. Borrowing to
          bet. Hiding it from people close to you. Betting to feel better rather than
          because you saw something worth backing. Being unable to stop when you decide to.
        </p>
      </section>

      <section>
        <h2>What you can do here</h2>
        <p>
          Set a monthly analysis limit in{" "}
          <Link href="/settings">your settings</Link>. When you hit it, new analyses stop
          until the month turns over — no override, no upsell. Your history stays readable
          so you can look at your actual returns rather than the ones you remember.
        </p>
      </section>

      <section>
        <h2>Where to get help</h2>
        <ul className="space-y-4">
          {RESOURCES.map((resource) => (
            <li key={resource.name}>
              <a href={resource.href} target="_blank" rel="noopener noreferrer">
                {resource.name}
              </a>
              <p className="tabular mt-0.5">{resource.detail}</p>
            </li>
          ))}
        </ul>
        <p>
          These services are free, confidential, and have nothing to do with us. Using them
          is not an admission of anything.
        </p>
      </section>
    </LegalShell>
  );
}
