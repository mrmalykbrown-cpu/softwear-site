# OddScope — single file

The whole application is `index.html`. Open it, serve it from anywhere, drop it on a
CDN. No build step, no bundler, no framework, no `npm install`.

Two small things live beside it, and both exist for reasons that cannot be worked
around:

| File | Why it is not in the HTML |
|---|---|
| `supabase/functions/analyze/` | Holds `ANTHROPIC_API_KEY`. A key in the HTML is a key anyone can read with View Source and spend. |
| `supabase/functions/whop-webhook/` | A webhook is an inbound HTTP endpoint. A page cannot receive one. |
| `supabase/migrations/0001_init.sql` | Tables, row-level security, and the rules the browser is not allowed to talk its way around. |

Everything else — the landing page, sign-up, dashboard, the analysis flow, history,
settings, the charts, the CSV export — runs in the browser against Supabase.

---

## Setup

### 1. Database

Run `supabase/migrations/0001_init.sql` in the Supabase SQL editor, or:

```bash
supabase link --project-ref fttdtvmfzaggfihieurr
supabase db push
```

### 2. Configure the page

Open `index.html`, find the `CONFIG` block near the top of the script, and paste your
**anon** key:

```js
const CONFIG = {
  SUPABASE_URL: "https://fttdtvmfzaggfihieurr.supabase.co",
  SUPABASE_ANON_KEY: "eyJ...",          // Project Settings -> API -> anon / public
  WHOP_CHECKOUT_URL: "https://whop.com/checkout/plan_xxxx",
  WHOP_PORTAL_URL: "https://whop.com/orders",
  PRICE_LABEL: "R147",
};
```

The anon key belongs in this file. It is designed to be public: every table has RLS
enabled and the policies in the migration are what make it safe — the key grants
nothing on its own.

**Never paste the `service_role` key here.** That one bypasses RLS entirely, and this
file is served to anybody who opens the page.

### 3. Deploy the functions

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set WHOP_WEBHOOK_SECRET=whsec_...

supabase functions deploy analyze
supabase functions deploy whop-webhook --no-verify-jwt
```

`--no-verify-jwt` on the webhook only: Whop authenticates with a signature, not a
Supabase session. Then point the Whop webhook at
`https://fttdtvmfzaggfihieurr.supabase.co/functions/v1/whop-webhook`.

Optional secrets: `ANTHROPIC_MODEL` (default `claude-sonnet-4-6`),
`ANTHROPIC_WEB_SEARCH_TOOL` (default `web_search_20250305`; `claude-sonnet-4-6` also
supports `web_search_20260209`, which adds dynamic result filtering), and
`ALLOWED_ORIGIN` to lock CORS to your domain instead of `*`.

### 4. Auth

In **Authentication → Providers**, enable Email and (optionally) Google. In
**URL Configuration**, add wherever you host the page as a redirect URL.

If email confirmation is on, sign-up says so and waits for the link rather than
silently landing on a logged-out dashboard.

### 5. Serve it

```bash
python3 -m http.server 8000     # or Netlify, Vercel, S3, GitHub Pages, anything
```

Opening the file directly with `file://` will not work: browsers block ES module
imports from that origin. Any HTTP server is enough.

---

## Where the rules actually live

The browser is untrusted by construction, so "validate on the server" here means
"validate in the database" or "validate in the Edge Function". Nothing important is
enforced in JavaScript that ships to the page.

**In Postgres:**

- `profit_loss` is a `GENERATED` column. The client cannot write it — it falls out of
  the outcome, the stake and the price. So are `implied_probability` and
  `edge_percent`. Arithmetic the database computes cannot be argued with.
- A trigger reverts every column of a recommendation except `outcome`, so marking a bet
  won cannot quietly also rewrite the odds it was struck at. The same trigger enforces
  the 24-hour edit window and refuses to settle a no-value tier.
- A trigger reverts the billing columns on a profile for anyone who is not
  `service_role`, so a user cannot set their own plan to `ACTIVE`.
- RLS denies everything by default; each policy opens only what the app needs.

**In the Edge Function:**

- Identity comes from the verified JWT, never from the request body.
- The plan gate, the hourly limit (10) and the user's monthly cap are all checked here,
  because they are the checks that cost money.
- Analyses are inserted by the function, never by the browser: writing one costs money,
  so the decision to write one happens behind the key.

## The math is ours, not the model's

The pipeline trusts the model for exactly two things: **which selection** and **what
probability**. Everything else is recomputed from the odds on the screenshot.

If the model reports a price that drifts from the screenshot by more than 1%, the
screenshot wins. If it claims value but the recomputed edge fails to clear 0.5% — inside
the error bars of any estimate built from six results and an injury list — the tier
collapses to no-value. The model can be overruled by its own numbers.

Refusing to fill a tier is the point. Always finding three picks is the single biggest
way a product like this fails its users, so the prompt says so emphatically and
`buildRecommendations` enforces it regardless.

## A note on the numbers on the landing page

Every figure in the sample analysis is computed at render time by the same functions the
app uses — the margin, both edges, both quarter-Kelly stakes. Nothing is typed in by
hand. A page whose whole argument is "check the arithmetic" cannot afford arithmetic that
does not check out.

The sample deliberately shows one tier flagged **No value found**. That single detail is
the most honest thing on the page.

## Verified

- `index.html` rendered in Chromium at 1280px and 390px: no page errors, no horizontal
  overflow, all nine landing-page arithmetic assertions passing.
- Both Edge Functions typecheck clean under Deno against the real `@anthropic-ai/sdk`
  and `@supabase/supabase-js`.
- The live pipeline has **not** been run end to end — that needs a real Anthropic key
  and a deployed function. Watch the first real screenshot.
