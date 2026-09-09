# OddScope

Screenshot a bookmaker's odds board for a football match. OddScope reads the odds,
researches the fixture, estimates its own probability for each selection, and returns
three bets ranked by risk — SAFE, BALANCED, AGGRESSIVE — each with its edge, its
suggested stake and its reasoning.

The promise is not "we pick winners". It is: **you see the math before you stake, and
the app tells you when there is no bet worth making.**

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript |
| Styling | Tailwind CSS v4 (CSS-first tokens in `src/app/globals.css`) |
| Database | PostgreSQL via Prisma (Neon or Supabase) |
| Auth | NextAuth v4 — email/password + Google OAuth, JWT sessions |
| Analysis | Anthropic API (`claude-sonnet-4-6`) with server-side web search |
| Billing | Whop — hosted checkout, webhook-synced |
| Charts | Recharts |
| Tests | Vitest |

Every Anthropic call runs inside a Route Handler. `src/lib/env.ts` is marked
`server-only`, so importing the API key into a client component fails the build rather
than shipping the key.

## Getting started

```bash
npm install
cp .env.example .env          # then fill it in
npm run db:deploy             # apply migrations
npm run dev
```

`npm install` runs `prisma generate` automatically.

### Environment

Everything is documented inline in `.env.example`. The four you cannot run without are
`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET` and `ANTHROPIC_API_KEY`. Google sign-in
hides itself when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are blank, so you can develop
without it.

`DIRECT_URL` exists because Neon and Supabase hand you a pooled connection that cannot run
DDL. If your database has no pooler, set it to the same value as `DATABASE_URL`.

### Scripts

```
npm run dev          # dev server
npm run build        # prisma generate + next build
npm test             # vitest run
npm run typecheck    # tsc --noEmit
npm run db:migrate   # create a migration from schema changes
npm run db:deploy    # apply migrations (use this in CI/production)
npm run db:studio    # browse the data
```

## How the analysis works

Two sequential calls to the Messages API, deliberately kept apart — a model asked to
transcribe and reason in one pass will quietly round an odd to fit its argument.

**Call 1 — extraction** (`extractOdds`). The screenshot goes up as a base64 image block.
The system prompt allows exactly one thing: transcribing what is legible. An unreadable or
non-betting image returns `{"error": "unreadable"}` and the user is asked for a better
screenshot. It is instructed never to guess a price.

**Call 2 — enrichment and analysis** (`analyzeMatch`). The extracted JSON plus the user's
notes go up with the web-search tool enabled and adaptive thinking on. The model searches
for recent results, head-to-head record, confirmed injuries and suspensions, and home/away
splits, then estimates a probability for each selection and cites the evidence that moved
it. The response is streamed so progress reflects reality: `researching` fires when the
first web search actually starts, not on a timer. `pause_turn` is resumed automatically.

Both calls parse defensively — fences stripped, Zod-validated, one retry on malformed
output before the analysis is marked `FAILED` with a message the user can act on.

### The math is ours, not the model's

`src/lib/pipeline.ts` accepts exactly two judgements from the model: **which selection**
and **what probability**. Everything else is recomputed from the odds on the screenshot:

- implied probability = `1 / odds`
- house margin = `sum(1/odds) - 1` over the market with the most selections
- edge = `(probability x odds) - 1`
- stake = quarter-Kelly, in units of 1% of bankroll, capped at 3.0

If the model reports a price that disagrees with the screenshot, the screenshot wins. If
the model claims value but the recomputed edge fails to clear 0.5% — inside the error bars
of any estimate built from six results and an injury list — the tier collapses to
no-value. The model can be overruled by its own numbers.

### Refusing to fill a tier

The single biggest failure mode for a product like this is always finding three picks. The
analysis prompt says so emphatically, and `buildRecommendations` enforces it. A response of
one pick and two no-value tiers is a good answer. Three no-value tiers is a good answer.

## Layout

```
prisma/schema.prisma        data model + initial migration
src/app/(marketing)         landing page, terms, privacy, responsible gambling, contact
src/app/(auth)              login, signup
src/app/(app)               dashboard, analyze, history, settings (auth-gated)
src/app/api                 route handlers
src/lib/betting.ts          the arithmetic — implied probability, margin, edge, Kelly
src/lib/pipeline.ts         model output -> recommendations we will stand behind
src/lib/anthropic.ts        the two-call pipeline
src/lib/prompts.ts          the system prompts
src/lib/stats.ts            ROI, strike rate, streaks, per-tier breakdown
src/middleware.ts           route protection
```

## Billing

Checkout is entirely Whop's. There is no payment flow, no Stripe, no card field anywhere in
this codebase.

New accounts get `plan = TRIAL` and `trialEndsAt = now + 3 days`. Upgrade CTAs link to
`WHOP_CHECKOUT_URL` with the OddScope `user.id` attached as
`metadata[oddscope_user_id]`, which is how the incoming webhook finds the right account.

`/api/webhooks/whop` verifies the signature over the **raw** request body and handles:

| Event | Effect |
|---|---|
| `membership.went_valid` | `plan = ACTIVE`, store membership id and renewal date |
| `membership.went_invalid` | `plan = EXPIRED` |
| `membership.cancel_at_period_end_changed` | update `subscriptionEndsAt` only |

Point Whop at `https://your-domain/api/webhooks/whop` and put the signing secret in
`WHOP_WEBHOOK_SECRET`.

Middleware gates `/analyze` when the plan has lapsed. `/history` and `/settings` stay open
to anyone signed in — a lapsed subscriber can still read and export their own performance
data. That is deliberate.

## Limits

- 10 analyses per user per hour, counted from the `Analysis` table so it survives redeploys
  and holds across serverless instances.
- An optional monthly cap the user sets on themselves in Settings. Hitting it blocks new
  analyses until the month turns over, with no override and no upsell.
- Screenshots are compressed to 1600px wide in the browser before upload.

## Deployment

Deploy to Vercel from `apps/oddscope`. Set every variable from `.env.example` in the
project settings, then run `npm run db:deploy` against production once.

`/api/analyze` declares `maxDuration = 300` — analysis takes 20-40 seconds and the default
serverless timeout will cut it off. Screenshots are stored as data URLs on the `Analysis`
row unless `BLOB_READ_WRITE_TOKEN` is set, in which case they are uploaded to Vercel Blob
and only the URL is stored. Adding the token later needs no migration.

## Tests

```bash
npm test
```

77 tests over the parts that must not be wrong: the betting arithmetic, the aggregation of
ROI and strike rate, the recommendation builder's willingness to overrule the model, plan
gating, and Whop signature verification including forged and replayed signatures.

## A note on the copy

There are no fabricated earnings counters, invented testimonials or countdown timers
anywhere in this product, and there should never be. Every number on the landing page is
computed with the same functions the app uses — a page whose whole argument is "check the
arithmetic" cannot afford arithmetic that does not check out. The sample analysis shows a
tier flagged `NO VALUE FOUND` on purpose: it is the most honest thing on the page.
