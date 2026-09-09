/**
 * OddScope — the analysis endpoint.
 *
 * This function exists for one reason: ANTHROPIC_API_KEY must never reach a
 * browser. Everything else in this product runs as static HTML against
 * PostgREST; this is the single piece that needs a secret, so it is the single
 * piece that runs on a server.
 *
 * Because the client is untrusted by construction, the checks that cost money
 * or grant access all happen here — plan, hourly limit, monthly cap — using the
 * service role, and the caller's identity comes from their verified JWT rather
 * than from anything they sent in the body.
 */
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { ANALYSIS_SYSTEM_PROMPT, EXTRACTION_SYSTEM_PROMPT, buildAnalysisUserMessage } from "./prompts.ts";
import {
  buildRecommendations,
  parseLooseJson,
  referenceMarketMargin,
  usableMarkets,
} from "./pipeline.ts";

const ANALYSES_PER_HOUR = 10;
const MAX_PAUSE_CONTINUATIONS = 4;
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
// claude-sonnet-4-6 also supports web_search_20260209, which adds dynamic
// result filtering. Pinned here so it can be rolled forward without a redeploy.
const WEB_SEARCH_TOOL = Deno.env.get("ANTHROPIC_WEB_SEARCH_TOOL") ?? "web_search_20250305";

const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

type Stage = "reading" | "identifying" | "researching" | "calculating";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authHeader = request.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "You need to be signed in to run an analysis." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Identity comes from the token, verified by Supabase — never from the body.
  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: auth, error: authError } = await asUser.auth.getUser();
  if (authError || !auth?.user) {
    return json({ error: "Your session has expired. Sign in again." }, 401);
  }
  const userId = auth.user.id;

  // Everything from here runs with the service role, which bypasses RLS.
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: profile } = await db
    .from("profiles")
    .select("plan, trial_ends_at, subscription_ends_at, stake_unit_size, monthly_analysis_limit")
    .eq("id", userId)
    .single();

  if (!profile) return json({ error: "Account not found." }, 401);

  // --- Plan gate ----------------------------------------------------------
  const now = Date.now();
  const active = profile.plan === "ACTIVE" &&
    (!profile.subscription_ends_at || Date.parse(profile.subscription_ends_at) > now);
  const trialing = profile.plan === "TRIAL" &&
    Boolean(profile.trial_ends_at) && Date.parse(profile.trial_ends_at!) > now;

  if (!active && !trialing) {
    return json({
      error: profile.plan === "TRIAL"
        ? "Your three-day trial has ended."
        : "Your subscription is no longer active.",
      upgrade: true,
    }, 402);
  }

  // --- Limits -------------------------------------------------------------
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const { count: recent } = await db
    .from("analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", hourAgo);

  if ((recent ?? 0) >= ANALYSES_PER_HOUR) {
    return json({
      error: "You've run ten analyses in the past hour. Give it a few minutes and try again.",
    }, 429);
  }

  if (profile.monthly_analysis_limit) {
    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    const { count: thisMonth } = await db
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart.toISOString());

    if ((thisMonth ?? 0) >= profile.monthly_analysis_limit) {
      return json({
        error:
          `You've reached the monthly limit of ${profile.monthly_analysis_limit} analyses you set for yourself. It resets at the start of next month.`,
        monthlyCap: true,
      }, 429);
    }
  }

  // --- Body ---------------------------------------------------------------
  let body: { image?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Malformed request." }, 400);
  }

  const image = body.image ?? "";
  const notes = (body.notes ?? "").slice(0, 1000);
  const imageMatch = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/.exec(image);
  if (!imageMatch) return json({ error: "Upload a PNG, JPG or WebP screenshot." }, 400);
  if (image.length > 8_000_000) {
    return json({ error: "That image is too large. Try again at a lower quality." }, 400);
  }

  const mediaType = imageMatch[1] === "image/jpg" ? "image/jpeg" : imageMatch[1];
  const base64 = imageMatch[2];

  const anthropic = new Anthropic({
    apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    maxRetries: 2,
  });

  // --- Stream -------------------------------------------------------------
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      // The row is created before any model call, so a screenshot we fail to
      // read still counts against the hourly limit and still shows up in the
      // user's history rather than vanishing.
      const { data: created, error: createError } = await db
        .from("analyses")
        .insert({ user_id: userId, user_notes: notes || null, status: "PROCESSING" })
        .select("id")
        .single();

      if (createError || !created) {
        send({ stage: "error", message: "We couldn't start the analysis. Try again.", retryable: true });
        controller.close();
        return;
      }

      const analysisId = created.id;
      const fail = async (message: string, retryable = true) => {
        await db.from("analyses")
          .update({ status: "FAILED", failure_reason: message })
          .eq("id", analysisId);
        send({ stage: "error", message, retryable });
        controller.close();
      };

      try {
        send({ stage: "reading" });

        // --- Call 1: extraction -------------------------------------------
        const extraction = await withRetry(async () => {
          const message = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 8000,
            system: EXTRACTION_SYSTEM_PROMPT,
            messages: [{
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: mediaType as "image/png", data: base64 } },
                { type: "text", text: "Read every legible odd in this screenshot and return the JSON." },
              ],
            }],
          });
          return parseLooseJson(textOf(message)) as Record<string, unknown>;
        });

        if (extraction?.error) {
          await fail(
            "We couldn't read that screenshot. Make sure the odds are in focus and the whole market is visible, then try again.",
          );
          return;
        }

        const markets = usableMarkets(extraction);
        if (markets.length === 0) {
          await fail(
            "We couldn't find any odds in that image. Screenshot the market itself — the list of selections and their prices.",
          );
          return;
        }

        const homeTeam = String(extraction.home_team ?? "").trim() || "Home";
        const awayTeam = String(extraction.away_team ?? "").trim() || "Away";
        const kickoff = parseDate(extraction.kickoff);

        await db.from("analyses").update({
          home_team: homeTeam,
          away_team: awayTeam,
          competition: nullableString(extraction.competition),
          kickoff,
          bookmaker: nullableString(extraction.bookmaker),
          raw_extraction: extraction,
        }).eq("id", analysisId);

        send({ stage: "identifying", homeTeam, awayTeam });

        // --- Call 2: enrichment and analysis ------------------------------
        const analysis = await withRetry(async () => {
          const message = await runAnalysis(
            anthropic,
            buildAnalysisUserMessage(extraction, notes),
            (stage) => send({ stage }),
          );
          return parseLooseJson(textOf(message)) as Record<string, unknown>;
        });

        const picks = Array.isArray(analysis.picks) ? analysis.picks : [];
        const built = buildRecommendations(markets, picks, profile.stake_unit_size);

        const computedMargin = referenceMarketMargin(markets);
        const reportedMargin = Number(analysis.bookmaker_margin);
        const margin = computedMargin ??
          (Number.isFinite(reportedMargin) && reportedMargin >= 0 && reportedMargin < 1
            ? reportedMargin
            : null);

        // If every tier came back no-value there is nothing to mark, so the
        // analysis is complete on arrival rather than waiting forever.
        const anythingToBet = built.some((row) => !row.no_value);

        await db.from("recommendations").insert(
          built.map((row) => ({ ...row, analysis_id: analysisId })),
        );

        await db.from("analyses").update({
          match_summary: nullableString(analysis.match_summary),
          bookmaker_margin: margin,
          status: anythingToBet ? "PENDING" : "SETTLED",
        }).eq("id", analysisId);

        send({ stage: "done", analysisId });
        controller.close();
      } catch (error) {
        console.error("[analyze]", error);
        await fail(userFacingMessage(error));
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS,
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
});

// ---------------------------------------------------------------------------

function textOf(message: { content: Array<{ type: string; text?: string }> }): string {
  return message.content.filter((block) => block.type === "text").map((block) => block.text ?? "").join("");
}

const nullableString = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text && text !== "null" ? text : null;
};

function parseDate(value: unknown): string | null {
  const text = nullableString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** One retry: malformed JSON from a model is usually not reproducible. */
async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch {
    return await run();
  }
}

/**
 * Stream one analysis turn, resuming through `pause_turn`.
 *
 * Server-side tools run in a sampling loop with its own iteration cap; when
 * that is reached the turn comes back paused rather than finished, and sending
 * the conversation straight back resumes it. No extra user message is added —
 * the trailing server_tool_use block is what tells the API to continue.
 *
 * Progress is reported from what the model is actually doing: a search starting
 * means research, the first text block means it is writing the priced answer.
 */
async function runAnalysis(
  anthropic: Anthropic,
  userMessage: string,
  onProgress: (stage: Stage) => void,
) {
  const tool = { type: WEB_SEARCH_TOOL, name: "web_search", max_uses: 8 };
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];

  let announcedResearch = false;
  let announcedCalculating = false;

  for (let attempt = 0; attempt <= MAX_PAUSE_CONTINUATIONS; attempt += 1) {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 32_000,
      system: ANALYSIS_SYSTEM_PROMPT,
      thinking: { type: "adaptive" },
      tools: [tool as unknown as Anthropic.ToolUnion],
      messages,
    });

    stream.on("streamEvent", (event) => {
      if (event.type !== "content_block_start") return;
      const block = event.content_block;
      if (block.type === "server_tool_use" && !announcedResearch) {
        announcedResearch = true;
        onProgress("researching");
      } else if (block.type === "text" && !announcedCalculating) {
        announcedCalculating = true;
        onProgress("calculating");
      }
    });

    const message = await stream.finalMessage();
    if (message.stop_reason !== "pause_turn") return message;

    messages.push({ role: "assistant", content: message.content });
  }

  throw new Error("pause_turn limit reached");
}

function userFacingMessage(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "The analysis service is not configured correctly. This is on us, not you.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "The analysis service is busy right now. Try again in a minute.";
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "We couldn't reach the analysis service. Check your connection and try again.";
  }
  if (error instanceof SyntaxError) {
    return "The analysis came back malformed twice in a row. Try again in a moment.";
  }
  return "Something went wrong during analysis. Try again.";
}
