/**
 * Recovering JSON from a model response.
 *
 * The prompts forbid markdown fences and the model normally obeys. "Normally"
 * is not a contract, so this strips fences, then falls back to the outermost
 * brace pair, before giving up and letting the caller retry.
 *
 * Kept out of lib/anthropic so it can be unit-tested without pulling in the
 * server-only client.
 */
export function parseLooseJson(raw: string): unknown {
  const text = raw.trim();

  const withoutFences = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(withoutFences);
  } catch {
    // Fall through to brace matching.
  }

  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(withoutFences.slice(start, end + 1));
    } catch {
      // Fall through to the throw below.
    }
  }

  throw new SyntaxError("Model response was not valid JSON.");
}
