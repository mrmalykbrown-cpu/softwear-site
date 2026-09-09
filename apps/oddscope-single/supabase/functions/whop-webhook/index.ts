/**
 * Whop webhook receiver — the only writer of billing state.
 *
 * The database trigger `lock_billing_columns` reverts plan changes for every
 * role except service_role, so this function is not merely the conventional
 * place billing is updated: it is the only place that can.
 *
 * Deploy with --no-verify-jwt: Whop authenticates with a signature, not a
 * Supabase session.
 */
import { createClient } from "@supabase/supabase-js";

/** The metadata key the checkout link carries so a membership finds its account. */
const USER_METADATA_KEY = "oddscope_user_id";

/** Signatures older than this are rejected when the header carries a timestamp. */
const TIMESTAMP_TOLERANCE_SECONDS = 300;

const encoder = new TextEncoder();

async function hmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time comparison — a length-only check would leak the digest byte by byte. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

/**
 * Two header formats are accepted: a bare hex digest, and the structured
 * `t=<unix>,v1=<hex>` form. For the structured form both the timestamped
 * payload and the bare body are checked, because Whop has shipped both
 * conventions and an endpoint that understands only one fails silently — which,
 * for billing, means people who paid staying locked out.
 */
async function verify(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;

  if (header.includes("v1=")) {
    const parts = Object.fromEntries(
      header.split(",")
        .map((piece) => piece.trim().split("="))
        .filter((pair): pair is [string, string] => pair.length === 2),
    );

    const signature = parts.v1;
    if (!signature) return false;

    const timestamp = parts.t;
    if (timestamp) {
      const age = Math.abs(Date.now() / 1000 - Number(timestamp));
      if (!Number.isFinite(age) || age > TIMESTAMP_TOLERANCE_SECONDS) return false;
      if (timingSafeEqual(signature, await hmac(secret, `${timestamp}.${rawBody}`))) return true;
    }

    return timingSafeEqual(signature, await hmac(secret, rawBody));
  }

  return timingSafeEqual(header.trim(), await hmac(secret, rawBody));
}

/** Whop sends seconds since epoch; some fields arrive as ISO strings instead. */
function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "number") {
    const date = new Date(value > 1e12 ? value : value * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed.", { status: 405 });

  // Read the raw bytes: the signature covers exactly what Whop sent, and
  // re-serialising parsed JSON would change the whitespace and fail every time.
  const rawBody = await request.text();
  const signature = request.headers.get("x-whop-signature") ?? request.headers.get("whop-signature");
  const secret = Deno.env.get("WHOP_WEBHOOK_SECRET") ?? "";

  if (!secret || !(await verify(rawBody, signature, secret))) {
    return new Response(JSON.stringify({ error: "Invalid signature." }), { status: 401 });
  }

  let event: { action?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Malformed payload." }), { status: 400 });
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const data = event.data ?? {};
  const membershipId = (data.id as string) ?? null;
  const renewal = toIso(data.renewal_period_end);

  // Resolve the account in descending order of reliability: the id we put on
  // the checkout link, a membership we have seen before, the Whop user id,
  // then the email address as a last resort.
  const metadata = data.metadata as Record<string, unknown> | undefined;
  const metadataId = typeof metadata?.[USER_METADATA_KEY] === "string"
    ? metadata[USER_METADATA_KEY] as string
    : null;

  let userId: string | null = null;
  for (const lookup of [
    metadataId ? db.from("profiles").select("id").eq("id", metadataId).maybeSingle() : null,
    membershipId ? db.from("profiles").select("id").eq("whop_membership_id", membershipId).maybeSingle() : null,
    data.user_id ? db.from("profiles").select("id").eq("whop_user_id", data.user_id).maybeSingle() : null,
    (data.user as { email?: string })?.email
      ? db.from("profiles").select("id").eq("email", String((data.user as { email: string }).email).toLowerCase()).maybeSingle()
      : null,
  ]) {
    if (!lookup) continue;
    const { data: found } = await lookup;
    if (found?.id) {
      userId = found.id;
      break;
    }
  }

  if (!userId) {
    // 200 on purpose: retrying will not make an unmatched membership match, and
    // a 4xx would have Whop redeliver it indefinitely.
    console.warn("[whop] no account matched", membershipId, event.action);
    return new Response(JSON.stringify({ ok: true, matched: false }), { status: 200 });
  }

  switch (event.action) {
    case "membership.went_valid":
      await db.from("profiles").update({
        plan: "ACTIVE",
        whop_membership_id: membershipId,
        whop_user_id: data.user_id ?? null,
        subscription_ends_at: renewal,
      }).eq("id", userId);
      break;

    case "membership.went_invalid":
      await db.from("profiles").update({
        plan: "EXPIRED",
        subscription_ends_at: renewal,
      }).eq("id", userId);
      break;

    case "membership.cancel_at_period_end_changed":
      // Still valid until the period ends — this only moves the date.
      await db.from("profiles").update({ subscription_ends_at: renewal }).eq("id", userId);
      break;

    default:
      return new Response(JSON.stringify({ ok: true, handled: false }), { status: 200 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
