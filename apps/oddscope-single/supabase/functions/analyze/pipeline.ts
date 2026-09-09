/**
 * The arithmetic, and the rules for turning a model response into rows.
 *
 * The model is trusted for exactly two things: which selection to back, and
 * what the true probability of it is. Everything else is recomputed here from
 * the odds on the screenshot. If the product's promise is that you see the
 * math before you stake, the math has to be ours.
 */

export const KELLY_FRACTION = 0.25;
export const MAX_STAKE_UNITS = 3;

/** One unit is one percent of bankroll, which is what makes the cap meaningful. */
export const UNITS_PER_BANKROLL = 100;

/**
 * An edge below half a percent is inside the error bars of any probability
 * built from six results and an injury list. The prompt says so; this makes it
 * binding, so a tier cannot be filled by a rounding artefact.
 */
export const MIN_MEANINGFUL_EDGE = 0.005;

/** Odds that disagree with the screenshot by more than this are corrected. */
const ODDS_DRIFT_TOLERANCE = 0.01;

export const TIERS = ["SAFE", "BALANCED", "AGGRESSIVE"] as const;
export type Tier = (typeof TIERS)[number];

export function impliedProbability(odds: number): number {
  return Number.isFinite(odds) && odds > 1 ? 1 / odds : 0;
}

export function edge(probability: number, odds: number): number {
  return Number.isFinite(odds) && odds > 1 ? probability * odds - 1 : -1;
}

export function quarterKellyUnits(probability: number, odds: number): number {
  if (!Number.isFinite(odds) || odds <= 1) return 0;
  const advantage = edge(probability, odds);
  if (advantage <= 0) return 0;
  const fraction = (advantage / (odds - 1)) * KELLY_FRACTION;
  return Math.min(Math.max(fraction * UNITS_PER_BANKROLL, 0), MAX_STAKE_UNITS);
}

/**
 * The margin of the market with the most selections — on a football screenshot
 * that is almost always the match result. A one-selection group says nothing
 * about the overround and is skipped.
 */
export function referenceMarketMargin(markets: ExtractedMarket[]): number | null {
  const groups = new Map<string, number[]>();
  for (const row of markets) {
    const key = normalize(row.market) || "unlabelled";
    const bucket = groups.get(key);
    if (bucket) bucket.push(row.odds);
    else groups.set(key, [row.odds]);
  }

  let best: number[] | null = null;
  for (const odds of groups.values()) {
    if (odds.length < 2) continue;
    if (!best || odds.length > best.length) best = odds;
  }
  if (!best) return null;

  const total = best.reduce((sum, odds) => sum + impliedProbability(odds), 0);
  return total > 0 ? total - 1 : 0;
}

export type ExtractedMarket = { market: string | null; selection: string; odds: number };

export type BuiltRecommendation = {
  tier: Tier;
  no_value: boolean;
  market: string | null;
  selection: string | null;
  odds: number | null;
  model_probability: number | null;
  stake_units: number | null;
  stake_amount: number | null;
  rationale: string | null;
};

const normalize = (value: unknown) =>
  String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const num = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

const str = (value: unknown): string | null => {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

/** Only rows that name a selection and carry a real price are usable. */
export function usableMarkets(raw: unknown): ExtractedMarket[] {
  const rows = Array.isArray((raw as { markets?: unknown })?.markets)
    ? ((raw as { markets: unknown[] }).markets)
    : [];

  return rows.flatMap((row) => {
    const record = row as Record<string, unknown>;
    const selection = str(record.selection);
    const odds = num(record.odds);
    if (!selection || odds == null || odds <= 1) return [];
    return [{ market: str(record.market), selection, odds }];
  });
}

/**
 * The price the screenshot actually shows for this selection, when we can find
 * it. The screenshot is ground truth: if the model drifted from it, even
 * slightly, the extracted number wins.
 */
function reconcileOdds(
  pickOdds: number | null,
  selection: string,
  market: string | null,
  markets: ExtractedMarket[],
): number | null {
  const wanted = normalize(selection);
  if (!wanted) return pickOdds;

  const match = markets.find(
    (row) => normalize(row.selection) === wanted && normalize(row.market) === normalize(market),
  ) ?? markets.find((row) => normalize(row.selection) === wanted);

  if (!match) return pickOdds;
  if (pickOdds == null) return match.odds;

  const drift = Math.abs(match.odds - pickOdds) / match.odds;
  return drift > ODDS_DRIFT_TOLERANCE ? match.odds : pickOdds;
}

function emptyTier(tier: Tier): BuiltRecommendation {
  return {
    tier,
    no_value: true,
    market: null,
    selection: null,
    odds: null,
    model_probability: null,
    stake_units: null,
    stake_amount: null,
    rationale: null,
  };
}

/**
 * Build exactly three recommendations, one per tier, in fixed order.
 *
 * A tier collapses to no-value when the model declined it, when it came back
 * incoherent, or when the recomputed edge does not clear MIN_MEANINGFUL_EDGE.
 * That last case matters most: the model may believe it found value and still
 * be overruled by its own numbers.
 */
export function buildRecommendations(
  markets: ExtractedMarket[],
  picks: unknown[],
  stakeUnitSize: number | null,
): BuiltRecommendation[] {
  const unitSize = stakeUnitSize && stakeUnitSize > 0 ? stakeUnitSize : null;

  return TIERS.map((tier) => {
    const pick = picks.find(
      (candidate) => normalize((candidate as Record<string, unknown>)?.tier) === tier.toLowerCase(),
    ) as Record<string, unknown> | undefined;

    if (!pick || pick.no_value === true || pick.no_value === "true") return emptyTier(tier);

    const selection = str(pick.selection);
    const market = str(pick.market);
    const probability = num(pick.model_probability);
    if (!selection || probability == null || probability <= 0 || probability >= 1) {
      return emptyTier(tier);
    }

    const odds = reconcileOdds(num(pick.odds), selection, market, markets);
    if (odds == null || odds <= 1) return emptyTier(tier);

    if (edge(probability, odds) < MIN_MEANINGFUL_EDGE) return emptyTier(tier);

    const stakeUnits = quarterKellyUnits(probability, odds);
    if (stakeUnits <= 0) return emptyTier(tier);

    return {
      tier,
      no_value: false,
      market,
      selection,
      odds,
      model_probability: probability,
      stake_units: Number(stakeUnits.toFixed(2)),
      stake_amount: unitSize ? Number((stakeUnits * unitSize).toFixed(2)) : null,
      rationale: str(pick.rationale),
    };
  });
}

/**
 * Recover the JSON object from a model response. The prompts forbid fences and
 * the model normally obeys; "normally" is not a contract.
 */
export function parseLooseJson(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    return JSON.parse(text);
  } catch {
    // Fall through to brace matching.
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      // Fall through to the throw.
    }
  }

  throw new SyntaxError("Model response was not valid JSON.");
}
