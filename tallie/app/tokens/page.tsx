import { notFound } from "next/navigation";

import { formatApprox, formatPercent, formatRand, parseAmountToCents, percentOf } from "@/lib/money";

/**
 * A specimen sheet for reviewing the token layer: every colour, radius and
 * type role on one page, plus the money helper's output. Development only —
 * delete it once the design is signed off, nothing else imports it.
 */
export const dynamic = "force-static";

const COLOURS = [
  { token: "--paper", swatch: "bg-paper", note: "page background (marketing)" },
  { token: "--canvas", swatch: "bg-canvas", note: "app background" },
  { token: "--ink", swatch: "bg-ink", note: "body text" },
  { token: "--muted", swatch: "bg-muted", note: "secondary text" },
  { token: "--faint", swatch: "bg-faint", note: "tertiary text, labels" },
  { token: "--pine", swatch: "bg-pine", note: "primary" },
  { token: "--pine-deep", swatch: "bg-pine-deep", note: "hover, dark panels" },
  { token: "--mint", swatch: "bg-mint", note: "surface tint" },
  { token: "--amber", swatch: "bg-amber", note: "offer mark and 80–100% only" },
  { token: "--amber-bg", swatch: "bg-amber-bg", note: "warning surface" },
  { token: "--over", swatch: "bg-over", note: "over 100% — placeholder value" },
  { token: "--over-bg", swatch: "bg-over-bg", note: "over-budget surface — placeholder" },
  { token: "--line", swatch: "bg-line", note: "hairlines" },
];

const AMOUNTS = [0, 599, 1599, 123456, 100000000, -4550];

export default function TokensPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl text-ink">Tallie tokens</h1>
      <p className="mt-2 text-muted">
        Development specimen. Every value below comes from app/globals.css.
      </p>

      <h2 className="font-display mt-12 text-xl text-ink">Colour</h2>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {COLOURS.map((colour) => (
          <li key={colour.token} className="flex items-center gap-4 py-3">
            <span
              className={`${colour.swatch} h-10 w-10 shrink-0 rounded-button border border-line`}
              aria-hidden="true"
            />
            <code className="font-numeral text-sm text-ink">{colour.token}</code>
            <span className="text-sm text-muted">{colour.note}</span>
          </li>
        ))}
      </ul>

      <h2 className="font-display mt-12 text-xl text-ink">Radius</h2>
      <div className="mt-4 flex flex-wrap gap-4">
        {[
          { label: "button — 8px", className: "rounded-button" },
          { label: "card — 12px", className: "rounded-card" },
          { label: "app — 16px", className: "rounded-app" },
        ].map((radius) => (
          <div
            key={radius.label}
            className={`${radius.className} border border-line bg-mint px-4 py-6 text-sm text-muted`}
          >
            {radius.label}
          </div>
        ))}
      </div>

      <h2 className="font-display mt-12 text-xl text-ink">Type</h2>
      <div className="mt-4 space-y-4 border-y border-line py-6">
        <p className="font-display text-4xl text-ink">Display — Bricolage Grotesque 700</p>
        <p className="text-base text-ink">
          Body — Inter Tight 400. The audience is South African, salaried, on a cellphone,
          budgeting between paydays. Colour, organise, realise, favourite.
        </p>
        <p className="font-numeral text-base text-ink">Numerals — Martian Mono 500</p>
      </div>

      <h2 className="font-display mt-12 text-xl text-ink">Money</h2>
      <table className="mt-4 w-full border-y border-line text-sm">
        <thead>
          <tr className="text-left text-faint">
            <th scope="col" className="py-2 font-medium">
              Cents
            </th>
            <th scope="col" className="py-2 font-medium">
              formatRand
            </th>
            <th scope="col" className="py-2 font-medium">
              cents: auto
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {AMOUNTS.map((amount) => (
            <tr key={amount}>
              <td className="font-numeral py-2 text-muted">{amount}</td>
              <td className="font-numeral py-2 text-ink">{formatRand(amount)}</td>
              <td className="font-numeral py-2 text-ink">{formatRand(amount, { cents: "auto" })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex gap-3">
          <dt className="text-muted">First week</dt>
          <dd className="font-numeral text-ink">{formatApprox(1599, 100)}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="text-muted">Then monthly</dt>
          <dd className="font-numeral text-ink">{formatApprox(16700, 1045)}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="text-muted">Typed &ldquo;R1 234,56&rdquo;</dt>
          <dd className="font-numeral text-ink">{String(parseAmountToCents("R1 234,56"))} cents</dd>
        </div>
        <div className="flex gap-3">
          <dt className="text-muted">2 400 of 3 000</dt>
          <dd className="font-numeral text-ink">{formatPercent(percentOf(240000, 300000))}</dd>
        </div>
      </dl>
    </main>
  );
}
