import "server-only";
import crypto from "node:crypto";
import { env } from "./env";

/**
 * Whop integration.
 *
 * Checkout, card capture and subscription management all happen on Whop. This
 * app never sees a card number and has no payment flow of its own — it only
 * reacts to webhooks telling it what Whop has decided.
 */

/** The metadata key Whop echoes back to us so a membership can find its account. */
export const WHOP_USER_METADATA_KEY = "oddscope_user_id";

/**
 * A checkout link carrying the OddScope user id, so the incoming
 * membership.went_valid webhook can be matched to the right account without
 * relying on email addresses lining up between the two systems.
 */
export function checkoutUrlFor(userId: string): string {
  const base = env.whopCheckoutUrl;
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}metadata[${WHOP_USER_METADATA_KEY}]=${encodeURIComponent(userId)}`;
}

/** Signatures older than this are rejected, when the header carries a timestamp. */
const TIMESTAMP_TOLERANCE_SECONDS = 300;

function timingSafeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length === 0 || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function hmac(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/**
 * Verify a Whop webhook signature against the raw request body.
 *
 * Two header formats are accepted: a bare hex digest, and the structured
 * `t=<unix>,v1=<hex>` form. For the structured form both the timestamped
 * payload and the bare body are checked, because Whop has shipped both
 * conventions and a webhook endpoint that only understands one of them fails
 * silently — which, for a billing endpoint, means users who paid staying
 * locked out.
 */
export function verifyWhopSignature(rawBody: string, header: string | null): boolean {
  if (!header) return false;

  const secret = env.whopWebhookSecret;

  if (header.includes("v1=")) {
    const parts = Object.fromEntries(
      header
        .split(",")
        .map((piece) => piece.trim().split("="))
        .filter((pair): pair is [string, string] => pair.length === 2),
    );

    const signature = parts.v1;
    if (!signature) return false;

    const timestamp = parts.t;
    if (timestamp) {
      const age = Math.abs(Date.now() / 1000 - Number(timestamp));
      if (!Number.isFinite(age) || age > TIMESTAMP_TOLERANCE_SECONDS) return false;
      if (timingSafeEqualHex(signature, hmac(secret, `${timestamp}.${rawBody}`))) return true;
    }

    return timingSafeEqualHex(signature, hmac(secret, rawBody));
  }

  return timingSafeEqualHex(header.trim(), hmac(secret, rawBody));
}

export type WhopEvent = {
  action?: string;
  data?: {
    id?: string;
    user_id?: string;
    status?: string;
    valid?: boolean;
    renewal_period_end?: number | string | null;
    cancel_at_period_end?: boolean;
    metadata?: Record<string, unknown> | null;
    user?: { email?: string } | null;
  };
};

/** Whop sends seconds-since-epoch; some fields arrive as ISO strings instead. */
export function toDate(value: number | string | null | undefined): Date | null {
  if (value == null) return null;
  if (typeof value === "number") {
    const ms = value > 1e12 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
