import { z } from "zod";

/**
 * Wire schemas for the two model calls.
 *
 * These are permissive about shape and strict about types. A language model
 * asked for JSON will occasionally return a null where a string was specified
 * or an odds value as the string "2.10"; none of that is worth failing an
 * analysis over, so coercion happens here and validation happens after it.
 */

/** "2.10", 2.1 and " 2.10 " all become 2.1. Anything else becomes null. */
const looseNumber = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((value) => {
    if (value == null || value === "") return null;
    const n = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
    return Number.isFinite(n) ? n : null;
  });

const looseString = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) => {
    if (value == null) return null;
    const s = String(value).trim();
    return s.length > 0 ? s : null;
  });

// ---------------------------------------------------------------------------
// Call 1 — extraction
// ---------------------------------------------------------------------------

export const extractedMarketSchema = z.object({
  market: looseString,
  selection: looseString,
  odds: looseNumber,
});

export const extractionSuccessSchema = z.object({
  home_team: looseString,
  away_team: looseString,
  competition: looseString,
  kickoff: looseString,
  bookmaker: looseString,
  markets: z.array(extractedMarketSchema).default([]),
});

export const extractionErrorSchema = z.object({
  error: z.string(),
});

export const extractionSchema = z.union([extractionErrorSchema, extractionSuccessSchema]);

export type ExtractedMarket = z.infer<typeof extractedMarketSchema>;
export type ExtractionSuccess = z.infer<typeof extractionSuccessSchema>;
export type ExtractionResult = z.infer<typeof extractionSchema>;

export function isExtractionError(
  result: ExtractionResult,
): result is z.infer<typeof extractionErrorSchema> {
  return "error" in result;
}

/** A market row is usable only if it names a selection and carries a real price. */
export function isUsableMarket(
  market: ExtractedMarket,
): market is ExtractedMarket & { selection: string; odds: number } {
  return Boolean(market.selection) && market.odds != null && market.odds > 1;
}

// ---------------------------------------------------------------------------
// Call 2 — enrichment and analysis
// ---------------------------------------------------------------------------

export const tierSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z.enum(["safe", "balanced", "aggressive"]),
);

const looseBoolean = z
  .union([z.boolean(), z.string()])
  .nullish()
  .transform((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.trim().toLowerCase() === "true";
    return false;
  });

export const pickSchema = z.object({
  tier: tierSchema,
  no_value: looseBoolean,
  market: looseString,
  selection: looseString,
  odds: looseNumber,
  model_probability: looseNumber,
  implied_probability: looseNumber,
  edge_percent: looseNumber,
  stake_units: looseNumber,
  rationale: looseString,
});

export const analysisSchema = z.object({
  match_summary: looseString,
  bookmaker_margin: looseNumber,
  picks: z.array(pickSchema).min(1),
});

export type ModelPick = z.infer<typeof pickSchema>;
export type ModelAnalysis = z.infer<typeof analysisSchema>;

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

/** Roughly 8MB of base64, which a 1600px JPEG never approaches. */
const MAX_DATA_URL_LENGTH = 8_000_000;

export const analyzeRequestSchema = z.object({
  image: z
    .string()
    .max(MAX_DATA_URL_LENGTH, "That image is too large. Try again at a lower quality.")
    .refine(
      (value) => /^data:image\/(png|jpeg|jpg|webp);base64,/.test(value),
      "Upload a PNG, JPG or WebP screenshot.",
    ),
  notes: z.string().max(1000).optional(),
});

export const settleRequestSchema = z.object({
  outcome: z.enum(["WON", "LOST", "VOID", "UNMARKED"]),
});

export const settingsRequestSchema = z.object({
  name: z.string().trim().max(120).optional(),
  bankroll: z.number().min(0).max(100_000_000).nullable().optional(),
  stakeUnitSize: z.number().min(0.01).max(1_000_000).nullable().optional(),
  currency: z.string().trim().length(3).optional(),
  monthlyAnalysisLimit: z.number().int().min(1).max(10_000).nullable().optional(),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(10, "Use at least 10 characters."),
  })
  .strict();

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  name: z.string().trim().max(120).optional(),
  password: z.string().min(10, "Use at least 10 characters."),
});
