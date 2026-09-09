/**
 * Environment access.
 *
 * Everything in this file is server-only. None of these names begin with
 * NEXT_PUBLIC_, so Next.js will not inline any of them into a client bundle —
 * which is the mechanism that keeps ANTHROPIC_API_KEY off the wire.
 *
 * Required values are read through `required()` rather than at module scope so
 * that a missing variable surfaces as a clear runtime error on the route that
 * actually needs it, instead of failing the whole build.
 */
import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example for what it should contain.`,
    );
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  get anthropicApiKey() {
    return required("ANTHROPIC_API_KEY");
  },
  /**
   * The spec pins claude-sonnet-4-6. Overridable so the model can be rolled
   * forward without a deploy of new code.
   */
  get anthropicModel() {
    return optional("ANTHROPIC_MODEL", "claude-sonnet-4-6");
  },
  /**
   * claude-sonnet-4-6 supports both the basic web-search tool and the newer
   * "web_search_20260209" variant with dynamic result filtering. The basic
   * variant is the default because it is the widest-supported one.
   */
  get anthropicWebSearchTool() {
    return optional("ANTHROPIC_WEB_SEARCH_TOOL", "web_search_20250305");
  },
  get whopCheckoutUrl() {
    return optional("WHOP_CHECKOUT_URL", "https://whop.com");
  },
  get whopWebhookSecret() {
    return required("WHOP_WEBHOOK_SECRET");
  },
  get whopPortalUrl() {
    return optional("WHOP_PORTAL_URL", "https://whop.com/orders");
  },
  get blobToken() {
    return optional("BLOB_READ_WRITE_TOKEN");
  },
  get googleClientId() {
    return optional("GOOGLE_CLIENT_ID");
  },
  get googleClientSecret() {
    return optional("GOOGLE_CLIENT_SECRET");
  },
  /** Google sign-in is only offered when both halves of the credential exist. */
  get googleEnabled() {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  },
};
